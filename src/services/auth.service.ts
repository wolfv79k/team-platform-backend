import bcrypt from "bcryptjs";
import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js";


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