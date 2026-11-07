import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js"

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
                    user: { omit: { passwordHash: true, email: true } },
                    role: true
                }
            }
        }
    })

    return project

}