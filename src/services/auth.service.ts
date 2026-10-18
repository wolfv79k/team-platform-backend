import bcrypt from "bcryptjs";
import prisma from "../config/db.js"


export async function register(email: string, username: string, password: string, locationId: number) {
    const checkEmail = await prisma.user.findUnique({
        where: { email }
    })

    if (checkEmail) {
        throw new Error("Данная почта уже зарегистрирована")
    }

    const checkUsername = await prisma.user.findUnique({
        where: { username }
    })

    if (checkUsername) {
        throw new Error("Пользователь с таким никнеймом уже существует")
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = prisma.user.create({ data: { email, username, passwordHash, locationId }, omit: { passwordHash: true } })

    return user
}