import bcrypt from "bcryptjs";
import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js";
import { getRefreshJwtSecret } from "../config/jwt.js"
import { sendVerificationEmail } from "../config/email.js"
import { Prisma, type User } from "../generated/prisma/client.js"
import { EMAIL_CODE_LIFETIME_MINUTES, generateVerificationCode } from "./emailVerification.service.js"
import { createRefreshSession } from "./refreshSession.service.js"

async function generateUsername(login: string | null, email: string | null) {
    const base = (login ?? email?.split('@')[0] ?? 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40) || 'user'
    let username = base
    while (await prisma.user.findUnique({ where: { username } })) {
        username = base + '_' + Math.floor(Math.random() * 10000)
    }
    return username
}

async function createAuthResponse(user: User) {
    const { passwordHash, ...publicUser } = user
    const tokens = await createRefreshSession(user.id)

    return { ...tokens, user: publicUser }
}

export async function register(email: string, username: string, password: string, locationId?: number | null) {
    const checkEmail = await prisma.user.findUnique({
        where: { email }
    })

    if (checkEmail) {
        throw new AppError("Данная почта уже зарегистрирована", 409)
    }

    const checkUsername = await prisma.user.findUnique({
        where: { username }
    })

    if (checkUsername) {
        throw new AppError("Пользователь с таким никнеймом уже существует", 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const { code, codeHash, createdAt, expiresAt } = generateVerificationCode(email)
    const user = await prisma.user.create({
        data: {
            email,
            username,
            passwordHash,
            locationId,
            emailVerified: false,
            emailVerificationCode: { create: { codeHash, createdAt, expiresAt } }
        },
        omit: { passwordHash: true }
    }).catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError("Почта или никнейм уже зарегистрированы", 409)
        }

        console.error("Не удалось сохранить данные подтверждения email")
        throw new AppError("Подтверждение email временно недоступно", 503)
    })

    const verificationEmailSent = await sendVerificationEmail(email, code, EMAIL_CODE_LIFETIME_MINUTES)

    return { user, verificationEmailSent }
}

export async function login(email: string, password: string) {
    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user || !user.passwordHash) {
        throw new AppError("Неверные почта или пароль", 401)
    }

    const checkPassword = await bcrypt.compare(password, user.passwordHash)

    if (!checkPassword) {
        throw new AppError("Неверные почта или пароль", 401)
    }

    if (!user.emailVerified) {
        throw new AppError("Подтвердите email перед входом", 403, "EMAIL_NOT_VERIFIED")
    }

    return createAuthResponse(user)
}

export async function oAuthLogin(provider: string, providerAccountId: string, name: string | null, email: string | null, image: string | null, providerLogin: string | null) {
    getRefreshJwtSecret()

    const account = await prisma.oAuthAccount.findUnique({
        where: {
            provider_providerAccountId: { provider, providerAccountId }
        },
        include: { user: true }

    })

    if (account) {
        return createAuthResponse(account.user)
    }

    if (email) {
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (user) {
            await prisma.oAuthAccount.create({
                data: {
                    userId: user.id,
                    provider,
                    providerAccountId
                }
            })
            return createAuthResponse(user)
        }
    }

    const newUser = await prisma.user.create({
        data: {
            username: await generateUsername(providerLogin, email),
            email,
            name,
            avatarUrl: image,
            oauthAccounts: {
                create: { provider, providerAccountId }
            }
        }
    })
    return createAuthResponse(newUser)
}



export async function getMe(userId: number) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        omit: { passwordHash: true }
    })

    if (!user) {
        throw new AppError("Пользователь не найден", 404)
    }

    return user
}



