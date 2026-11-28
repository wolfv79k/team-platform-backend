import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js"

export async function getNotifications(recipientId: number, data: { page: number, limit: number, isRead?: boolean }) {
    const { page, limit, isRead } = data
    const where = { recipientId, isRead }

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit
        }),
        prisma.notification.count({ where })
    ])

    const requestIds = notifications
        .filter(notification => notification.type === "PROJECT_REQUEST")
        .map(notification => notification.entityId)

    // Для входящей заявки фронтенду нужен ID проекта, чтобы открыть его список заявок.
    const requests = requestIds.length > 0 ? await prisma.projectApplication.findMany({
        where: {
            id: { in: requestIds },
            type: "REQUEST",
            project: { authorId: recipientId }
        },
        select: { id: true, projectId: true }
    }) : []
    const projectIds = new Map(requests.map(request => [request.id, request.projectId]))

    const items = notifications.map(notification => ({
        ...notification,
        projectId: notification.type === "PROJECT_REQUEST" ? projectIds.get(notification.entityId) ?? null : null
    }))

    return { items, total, page, limit }
}

export async function markNotificationRead(recipientId: number, notificationId: number) {
    const updated = await prisma.notification.updateMany({
        where: { id: notificationId, recipientId },
        data: { isRead: true }
    })

    if (updated.count === 0) {
        throw new AppError("Уведомление не найдено", 404)
    }
}
