import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import prisma from "../config/db.js"
import { sendVerificationEmail } from "../config/email.js"
import type { Prisma } from "../generated/prisma/client.js"
import { AppError } from "../utils/AppError.js"

export const EMAIL_CODE_LIFETIME_MINUTES = 10
const MAX_ATTEMPTS = 5
const RESEND_INTERVAL_MS = 60_000

function getEmailVerificationSecret() {
    const emailVerificationSecret = process.env.EMAIL_VERIFICATION_SECRET

    if (!emailVerificationSecret) {
        console.error("Требуется EMAIL_VERIFICATION_SECRET")
        throw new AppError("Подтверждение email временно недоступно", 503)
    }

    return emailVerificationSecret
}

function hashCode(secret: string, email: string, code: string) {
    return createHmac("sha256", secret).update(email).update("\0").update(code).digest("hex")
}

function handleVerificationError(error: unknown): never {
    if (error instanceof AppError) {
        throw error
    }

    // Ошибка Prisma может содержать хеш кода.
    console.error("Не удалось сохранить или проверить данные подтверждения email")
    throw new AppError("Подтверждение email временно недоступно", 503)
}

export function generateVerificationCode(email: string, previousCodeHash?: string) {
    const secret = getEmailVerificationSecret()
    let code: string
    let codeHash: string
    do {
        code = randomInt(1_000_000).toString().padStart(6, "0")
        codeHash = hashCode(secret, email, code)
    } while (codeHash === previousCodeHash)

    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + EMAIL_CODE_LIFETIME_MINUTES * 60_000)

    return { code, codeHash, createdAt, expiresAt }
}

async function lockUnverifiedUser(tx: Prisma.TransactionClient, email: string) {
    // Подтверждение и перевыпуск кода блокируют одну строку пользователя до конца транзакции.
    const [user] = await tx.$queryRaw<{ id: number }[]>`
        SELECT "id" FROM "User"
        WHERE "email" = ${email} AND "emailVerified" = false AND "passwordHash" IS NOT NULL
        FOR UPDATE
    `

    return user
}

export async function verifyEmail(email: string, code: string) {
    const secret = getEmailVerificationSecret()

    const verified = await prisma.$transaction(async (tx) => {
        const user = await lockUnverifiedUser(tx, email)

        if (!user) {
            return false
        }

        const userId = user.id
        const verificationCode = await tx.emailVerificationCode.findUnique({
            where: { userId }
        })

        if (!verificationCode || verificationCode.expiresAt.getTime() <= Date.now() || verificationCode.attempts >= MAX_ATTEMPTS) {
            return false
        }

        const storedCodeHash = Buffer.from(verificationCode.codeHash, "hex")
        const enteredCodeHash = Buffer.from(hashCode(secret, email, code), "hex")

        if (storedCodeHash.length !== enteredCodeHash.length || !timingSafeEqual(storedCodeHash, enteredCodeHash)) {
            await tx.emailVerificationCode.update({
                where: { userId },
                data: { attempts: { increment: 1 } }
            })

            return false
        }

        await tx.emailVerificationCode.delete({
            where: { userId }
        })
        await tx.user.update({
            where: { id: userId },
            data: { emailVerified: true }
        })

        return true
    }).catch(handleVerificationError)

    // Ошибка возвращается после транзакции, чтобы сохранить неверную попытку.
    if (!verified) {
        throw new AppError("Код недействителен. Проверьте код или запросите новый", 400)
    }
}

export async function resendVerification(email: string) {
    getEmailVerificationSecret()

    const newCode = await prisma.$transaction(async (tx) => {
        const user = await lockUnverifiedUser(tx, email)

        if (!user) {
            return
        }

        const userId = user.id
        const previousCode = await tx.emailVerificationCode.findUnique({
            where: { userId }
        })

        if (previousCode && Date.now() - previousCode.createdAt.getTime() < RESEND_INTERVAL_MS) {
            return
        }

        const { code, codeHash, createdAt, expiresAt } = generateVerificationCode(email, previousCode?.codeHash)
        await tx.emailVerificationCode.upsert({
            where: { userId },
            create: { userId, codeHash, createdAt, expiresAt },
            update: { codeHash, createdAt, expiresAt, attempts: 0 }
        })

        return code
    }).catch(handleVerificationError)

    if (newCode) {
        await sendVerificationEmail(email, newCode, EMAIL_CODE_LIFETIME_MINUTES)
    }
}
