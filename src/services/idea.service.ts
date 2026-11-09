import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js"
import { PUBLIC_USER_OMIT } from "../utils/publicUser.js"
import { PROJECT_DETAILS_INCLUDE } from "./project.service.js"

const IDEA_DETAILS_INCLUDE = {
    author: { omit: PUBLIC_USER_OMIT },
    project: true
} as const

async function getOwnedIdea(userId: number, ideaId: number) {
    const idea = await prisma.idea.findUnique({
        where: { id: ideaId }
    })

    if (!idea) {
        throw new AppError("Идея не найдена", 404)
    }

    if (idea.authorId !== userId) {
        throw new AppError("Действие доступно только автору идеи", 403)
    }

    return idea
}

export async function createIdea(authorId: number, data: { name: string, description?: string }) {
    const { name, description } = data

    const idea = await prisma.idea.create({
        data: {
            name,
            description,
            authorId
        },
        include: IDEA_DETAILS_INCLUDE
    })

    return idea

}

export async function getIdeaById(ideaId: number) {
    const idea = await prisma.idea.findUnique({
        where: { id: ideaId },
        include: IDEA_DETAILS_INCLUDE
    })

    if (!idea) {
        throw new AppError("Идея не найдена", 404)
    }

    return idea
}

export async function getIdeas(data: { page: number, limit: number }) {
    const { page, limit } = data

    const [ideas, total] = await Promise.all([
        prisma.idea.findMany({
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: IDEA_DETAILS_INCLUDE
        }),
        prisma.idea.count()
    ])
    return { items: ideas, total, page, limit }
}

export async function updateIdea(userId: number, ideaId: number, data: { name?: string, description?: string }) {
    const { name, description } = data

    await getOwnedIdea(userId, ideaId)

    const updated = await prisma.idea.update({
        where: {
            id: ideaId
        },
        data: {
            name,
            description
        },
        include: IDEA_DETAILS_INCLUDE

    })

    return updated
}

export async function deleteIdea(userId: number, ideaId: number) {

    await getOwnedIdea(userId, ideaId)

    await prisma.idea.delete({
        where: {
            id: ideaId
        }
    })
}

export async function convertIdeaToProject(userId: number, ideaId: number, roleId: number) {

    const idea = await getOwnedIdea(userId, ideaId)

    if (idea.projectId !== null) {
        throw new AppError("Из данной идеи уже создан проект", 409)
    }

    const role = await prisma.role.findUnique({
        where: { id: roleId }
    })

    if (!role) {
        throw new AppError("Роль не найдена", 404)
    }

    const project = await prisma.$transaction(async (tx) => {
        const created = await tx.project.create({
            data: {
                name: idea.name,
                description: idea.description,
                authorId: userId,
                projectMembers: {
                    create: { userId: userId, roleId: roleId }
                }
            },
            include: PROJECT_DETAILS_INCLUDE
        })
        await tx.idea.update({ where: { id: ideaId }, data: { projectId: created.id } })
        return created
    })

    return project
}

