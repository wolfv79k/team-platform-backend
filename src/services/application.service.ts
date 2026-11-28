import prisma from "../config/db.js"
import type { Prisma } from "../generated/prisma/client.js"
import type { ApplicationStatus, ApplicationType, ProjectStatus } from "../generated/prisma/enums.js"
import { AppError } from "../utils/AppError.js"
import { PUBLIC_USER_OMIT } from "../utils/publicUser.js"

// Что отдаём наружу вместе с заявкой: кто, в какой проект, на какую роль
export const APPLICATION_INCLUDE = {
    user: { omit: PUBLIC_USER_OMIT },
    role: true,
    project: { select: { id: true, name: true, status: true, logoUrl: true, authorId: true } }
} as const

// Общие проверки перед созданием заявки или приглашения
async function assertCanJoin(tx: Prisma.TransactionClient, userId: number, projectId: number, roleId: number) {
    const member = await tx.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } }
    })

    if (member) {
        throw new AppError("Пользователь уже участник проекта", 409)
    }

    const openRole = await tx.projectOpenRole.findUnique({
        where: { projectId_roleId: { projectId, roleId } }
    })

    if (!openRole) {
        throw new AppError("Эта роль не набирается в проекте", 400)
    }

    if (openRole.slots <= 0) {
        throw new AppError("На эту роль больше нет мест", 409)
    }

    // Одна висящая заявка или приглашение между человеком и проектом
    const pending = await tx.projectApplication.findFirst({
        where: { userId, projectId, status: "PENDING" }
    })

    if (pending) {
        throw new AppError("Заявка или приглашение уже ожидает ответа", 409)
    }
}

async function getProjectOrThrow(projectId: number) {
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    })

    if (!project) {
        throw new AppError("Проект не найден", 404)
    }

    return project
}

async function lockProjectForApplication(tx: Prisma.TransactionClient, projectId: number) {
    // Заявка и приглашение проверяют PENDING под одной блокировкой проекта.
    const [project] = await tx.$queryRaw<{ authorId: number, status: ProjectStatus }[]>`
        SELECT "authorId", "status" FROM "Project" WHERE "id" = ${projectId} FOR NO KEY UPDATE
    `

    if (!project) {
        throw new AppError("Проект не найден", 404)
    }

    return project
}

async function createApplicationWithNotification(
    tx: Prisma.TransactionClient,
    data: { userId: number, projectId: number, roleId: number, type: ApplicationType, message?: string },
    recipientId: number
) {
    const application = await tx.projectApplication.create({
        data,
        include: APPLICATION_INCLUDE
    })

    await tx.notification.create({
        data: {
            recipientId,
            entityId: application.id,
            type: data.type === "REQUEST" ? "PROJECT_REQUEST" : "PROJECT_INVITATION"
        }
    })

    return application
}

// Пользователь сам просится в проект
export async function applyToProject(userId: number, projectId: number, roleId: number, message?: string) {
    return prisma.$transaction(async (tx) => {
        const project = await lockProjectForApplication(tx, projectId)

        if (project.status !== "RECRUITMENT") {
            throw new AppError("Проект не набирает команду", 400)
        }

        if (project.authorId === userId) {
            throw new AppError("Автор уже состоит в проекте", 400)
        }

        await assertCanJoin(tx, userId, projectId, roleId)

        return createApplicationWithNotification(tx, { userId, projectId, roleId, message, type: "REQUEST" }, project.authorId)
    })
}

// Автор зовёт пользователя в проект
export async function inviteToProject(authorId: number, projectId: number, invitedUserId: number, roleId: number, message?: string) {
    return prisma.$transaction(async (tx) => {
        const project = await lockProjectForApplication(tx, projectId)

        if (project.authorId !== authorId) {
            throw new AppError("Приглашать может только автор проекта", 403)
        }

        if (invitedUserId === authorId) {
            throw new AppError("Нельзя пригласить себя", 400)
        }

        const invited = await tx.user.findUnique({
            where: { id: invitedUserId },
            select: { id: true }
        })

        if (!invited) {
            throw new AppError("Пользователь не найден", 404)
        }

        await assertCanJoin(tx, invitedUserId, projectId, roleId)

        return createApplicationWithNotification(tx, {
            userId: invitedUserId, projectId, roleId, message, type: "INVITATION"
        }, invitedUserId)
    })
}

// Находит заявку и проверяет, что решение принимает правильный человек:
// заявку (REQUEST) — автор проекта, приглашение (INVITATION) — приглашённый
async function getApplicationForDecision(userId: number, applicationId: number) {
    const application = await prisma.projectApplication.findUnique({
        where: { id: applicationId },
        include: { project: true }
    })

    if (!application) {
        throw new AppError("Заявка не найдена", 404)
    }

    const decidesUserId = application.type === "REQUEST" ? application.project.authorId : application.userId

    if (decidesUserId !== userId) {
        throw new AppError("Решение по этой заявке принимаете не вы", 403)
    }

    if (application.status !== "PENDING") {
        throw new AppError("По заявке уже принято решение", 409)
    }

    return application
}

export async function acceptApplication(userId: number, applicationId: number) {
    const application = await getApplicationForDecision(userId, applicationId)
    const { projectId, roleId } = application

    // Всё или ничего: статус заявки, новый участник и минус одно место
    await prisma.$transaction(async (tx) => {
        // Условие status: PENDING защищает от двойного принятия одновременно
        const updated = await tx.projectApplication.updateMany({
            where: { id: applicationId, status: "PENDING" },
            data: { status: "ACCEPTED" }
        })

        if (updated.count === 0) {
            throw new AppError("По заявке уже принято решение", 409)
        }

        const member = await tx.projectMember.findUnique({
            where: { userId_projectId: { userId: application.userId, projectId } }
        })

        if (member) {
            throw new AppError("Пользователь уже участник проекта", 409)
        }

        // Уменьшаем места, только если они ещё есть.
        // Роль при 0 местах остаётся в проекте (видно, что такие специалисты есть)
        const slots = await tx.projectOpenRole.updateMany({
            where: { projectId, roleId, slots: { gt: 0 } },
            data: { slots: { decrement: 1 } }
        })

        if (slots.count === 0) {
            throw new AppError("На эту роль больше нет мест", 409)
        }

        await tx.projectMember.create({
            data: { userId: application.userId, projectId, roleId }
        })
    })

    return prisma.projectApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: APPLICATION_INCLUDE
    })
}

export async function declineApplication(userId: number, applicationId: number) {
    await getApplicationForDecision(userId, applicationId)

    return prisma.projectApplication.update({
        where: { id: applicationId },
        data: { status: "DECLINED" },
        include: APPLICATION_INCLUDE
    })
}

// Отозвать: свою заявку — тот, кто подал; приглашение — автор проекта
export async function withdrawApplication(userId: number, applicationId: number) {
    const application = await prisma.projectApplication.findUnique({
        where: { id: applicationId },
        include: { project: true }
    })

    if (!application) {
        throw new AppError("Заявка не найдена", 404)
    }

    const ownerId = application.type === "REQUEST" ? application.userId : application.project.authorId

    if (ownerId !== userId) {
        throw new AppError("Отозвать может только тот, кто отправил", 403)
    }

    if (application.status !== "PENDING") {
        throw new AppError("По заявке уже принято решение", 409)
    }

    await prisma.projectApplication.delete({
        where: { id: applicationId }
    })
}

// Все заявки и приглашения проекта — видит только автор
export async function getProjectApplications(authorId: number, projectId: number, filters: { status?: ApplicationStatus, type?: ApplicationType }) {
    const project = await getProjectOrThrow(projectId)

    if (project.authorId !== authorId) {
        throw new AppError("Заявки проекта видит только автор", 403)
    }

    const where: Prisma.ProjectApplicationWhereInput = { projectId }

    if (filters.status) {
        where.status = filters.status
    }

    if (filters.type) {
        where.type = filters.type
    }

    return prisma.projectApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: APPLICATION_INCLUDE
    })
}

// Мои заявки (REQUEST) и приглашения мне (INVITATION)
export async function getMyApplications(userId: number, filters: { status?: ApplicationStatus, type?: ApplicationType }) {
    const where: Prisma.ProjectApplicationWhereInput = { userId }

    if (filters.status) {
        where.status = filters.status
    }

    if (filters.type) {
        where.type = filters.type
    }

    return prisma.projectApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: APPLICATION_INCLUDE
    })
}
