import bcrypt from "bcryptjs";
import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET

if (!secret) {
    throw new Error('JWT_SECRET не задан в .env')
}

const JWT_SECRET: string = secret

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

    if (!user) {
        throw new AppError("Неверные почта или пароль", 401)
    }

    const checkPassword = await bcrypt.compare(password, user.passwordHash)

    if (!checkPassword) {
        throw new AppError("Неверные почта или пароль", 401)
    }

    const { passwordHash, ...publicUser } = user

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" })

    return { token, user: publicUser }
}

