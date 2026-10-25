import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js";

export async function getUserByUsername(username: string) {
    const user = await prisma.user.findUnique({
        where: { username },
        include: {
            location: true,
            userSkills: { include: { skill: true } },
            projectMembers: { include: { project: true, role: true } }
        },
        omit: { passwordHash: true, email: true }
    })

    if (!user) {
        throw new AppError("Пользователь не найден", 404)
    }

    return user
}