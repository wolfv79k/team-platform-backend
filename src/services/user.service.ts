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

export async function updateMe(userId: number, data: { name?: string, bio?: string, username?: string, locationId?: number }) {
    const { name, bio, username, locationId } = data
    if (username) {
        const owner = await prisma.user.findUnique({
            where: { username }
        })

        if (owner && owner.id !== userId) {
            throw new AppError("Имя пользователя занято", 409)
        }
    }

    if (locationId !== undefined) {
        const exist = await prisma.location.findUnique({
            where: { id: locationId }
        })

        if (!exist) {
            throw new AppError("Город не найден", 400)

        }
    }

    const updateUser = await prisma.user.update({ where: { id: userId }, data: { name, bio, username, locationId }, omit: { passwordHash: true, email: true } })
    return updateUser
}