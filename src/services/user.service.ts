import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js"
import { SkillLevel } from "../generated/prisma/enums.js"
import supabase from "../config/supabase.js"
import { PUBLIC_USER_OMIT } from "../utils/publicUser.js"

export async function getUserByUsername(username: string) {
    const user = await prisma.user.findUnique({
        where: { username },
        include: {
            location: true,
            userSkills: { include: { skill: true } },
            projectMembers: { include: { project: true, role: true } }
        },
        omit: PUBLIC_USER_OMIT
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

    const updateUser = await prisma.user.update({ where: { id: userId }, data: { name, bio, username, locationId }, omit: PUBLIC_USER_OMIT })
    return updateUser
}

export async function setUserSkill(userId: number, skillId: number, skillLevel?: SkillLevel) {
    const skill = await prisma.skill.findUnique({
        where: { id: skillId }
    })

    if (!skill) {
        throw new AppError("Навык не найден", 404)
    }

    const result = await prisma.userSkill.upsert({
        where: { userId_skillId: { userId, skillId } },
        create: {
            userId, skillId, skillLevel
        },
        update: { skillLevel },
        include: { skill: true }
    })

    return result
}

export async function removeUserSkill(userId: number, skillId: number) {
    const result = await prisma.userSkill.deleteMany({
        where: { userId, skillId }
    })

    if (result.count === 0) {
        throw new AppError("Навык не найден в профиле", 404)
    }
}

export async function updateAvatar(userId: number, file: Express.Multer.File) {
    const ext = file.mimetype.split('/')[1]

    const path = `${userId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file.buffer, { contentType: file.mimetype })

    if (error) {
        console.error(error)
        throw new AppError("Не удалось загрузить файл", 500)
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)

    const user = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: data.publicUrl },
        omit: { passwordHash: true }
    })

    return user
}