import bcrypt from "bcryptjs";
import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js";
import jwt from "jsonwebtoken";
import JWT_SECRET from "../config/jwt.js";
import type { User } from "../generated/prisma/client.js";

async function generateUsername(login: string | null, email: string | null) {
    const base = (login ?? email?.split('@')[0] ?? 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40) || 'user'
    let username = base
    while (await prisma.user.findUnique({ where: { username } })) {
        username = base + '_' + Math.floor(Math.random() * 10000)
    }
    return username
}

function createAuthResponse(user: User) {
    const { passwordHash, ...publicUser } = user
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" })
    return { token, user: publicUser }
}

export async function register(email: string, username: string, password: string, locationId: number) {
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

    const user = await prisma.user.create({ data: { email, username, passwordHash, locationId }, omit: { passwordHash: true } })

    return user
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

    return createAuthResponse(user)
}

export async function oAuthLogin(provider: string, providerAccountId: string, name: string | null, email: string | null, image: string | null, providerLogin: string | null) {
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



