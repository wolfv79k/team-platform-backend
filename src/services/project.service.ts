import prisma from "../config/db.js"
import type { Prisma } from "../generated/prisma/client.js"
import type { ProjectStatus } from "../generated/prisma/enums.js"
import { AppError } from "../utils/AppError.js"
import { PUBLIC_USER_OMIT } from "../utils/publicUser.js"

const PROJECT_DETAILS_INCLUDE = {
    author: { omit: PUBLIC_USER_OMIT },
    projectMembers: { include: { user: { omit: PUBLIC_USER_OMIT }, role: true } },
    projectSkills: { include: { skill: true } },
    projectOpenRoles: { include: { role: true } }
} as const

async function getOwnedProject(userId: number, projectId: number) {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    })

    if (!project) {
        throw new AppError("Проект не найден", 404)
    }

    if (project.authorId !== userId) {
        throw new AppError("Действие доступно только автору проекта", 403)
    }

    return project
}

export async function createProject(authorId: number, data: { name: string, roleId: number, description?: string, slogan?: string, projectUrl?: string, videoUrl?: string, partners?: string[] }) {
    const { name, description, slogan, projectUrl, videoUrl, partners } = data


    const role = await prisma.role.findUnique({
        where: { id: data.roleId }
    })

    if (!role) {
        throw new AppError("Роль не найдена", 400)
    }

    const project = await prisma.project.create({
        data: {
            name,
            description,
            slogan,
            projectUrl,
            videoUrl,
            partners,
            authorId,
            projectMembers: {
                create: { userId: authorId, roleId: data.roleId }
            }
        },
        include: {
            projectMembers: {
                include: {
                    user: { omit: PUBLIC_USER_OMIT },
                    role: true
                }
            }
        }
    })

    return project

}

export async function getProjectById(projectId: number) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: PROJECT_DETAILS_INCLUDE
    })

    if (!project) {
        throw new AppError("Проект не найден", 404)
    }

    return project
}

export async function getProjects(data: { status?: ProjectStatus, skillId?: number, roleId?: number, search?: string, page: number, limit: number }) {
    const { status, skillId, roleId, search, page, limit } = data

    const where: Prisma.ProjectWhereInput = {}

    if (status) {
        where.status = status
    }

    if (skillId !== undefined) {
        where.projectSkills = { some: { skillId } }
    }

    if (roleId !== undefined) {
        where.projectOpenRoles = { some: { roleId } }
    }

    if (search) {
        where.name = { contains: search, mode: "insensitive" }
    }

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                author: { omit: PUBLIC_USER_OMIT },
                projectSkills: {
                    include: { skill: true }
                },
                projectOpenRoles: { include: { role: true } }
            }
        }),
        prisma.project.count({ where })
    ])
    return { items: projects, total, page, limit }
}

export async function updateProject(userId: number, projectId: number, data: { name?: string, status?: ProjectStatus, description?: string, slogan?: string, projectUrl?: string, videoUrl?: string, partners?: string[] }) {
    const { name, status, description, slogan, projectUrl, videoUrl, partners } = data

    await getOwnedProject(userId, projectId)

    const updated = await prisma.project.update({
        where: {
            id: projectId
        },
        data: {
            name,
            status,
            description,
            slogan,
            projectUrl,
            videoUrl,
            partners
        },
        include: PROJECT_DETAILS_INCLUDE

    })

    return updated
}

export async function deleteProject(userId: number, projectId: number) {

    await getOwnedProject(userId, projectId)

    await prisma.project.delete({
        where: {
            id: projectId
        }
    })
}