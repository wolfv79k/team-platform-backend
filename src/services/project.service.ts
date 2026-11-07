import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js"
import { PUBLIC_USER_OMIT } from "../utils/publicUser.js"

export async function createProject(authorId: number, data: { name: string, roleId: number, description?: string, slogan?: string, projectUrl?: string, videoUrl?: string, partners?: string[] }) {
    const role = await prisma.role.findUnique({
        where: { id: data.roleId }
    })

    if (!role) {
        throw new AppError("Роль не найдена", 400)
    }

    const project = await prisma.project.create({
        data: {
            name: data.name,
            description: data.description,
            slogan: data.slogan,
            projectUrl: data.projectUrl,
            videoUrl: data.videoUrl,
            partners: data.partners,
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
        include: {
            author: { omit: PUBLIC_USER_OMIT },
            projectMembers: { include: { user: { omit: { passwordHash: true, email: true } }, role: true } },
            projectSkills: { include: { skill: true } },
            projectOpenRoles: { include: { role: true } },
        }
    })

    if (!project) {
        throw new AppError("Проект не найден", 404)
    }

    return project
}