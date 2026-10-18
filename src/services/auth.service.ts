import bcrypt from "bcryptjs";
import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js";
import jwt from "jsonwebtoken";
import JWT_SECRET from "../config/jwt.js";

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

