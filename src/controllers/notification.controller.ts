import type { Request, Response } from "express"
import { getNotifications, markNotificationRead } from "../services/notification.service.js"
import { AppError } from "../utils/AppError.js"
import { parseId } from "../utils/parseId.js"
import { parsePagination } from "../utils/parsePagination.js"

export async function getNotificationsController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const { isRead } = req.query

    if (isRead !== undefined && isRead !== "true" && isRead !== "false") {
        throw new AppError("Некорректное значение isRead", 400)
    }

    const result = await getNotifications(userId, {
        ...parsePagination(req.query),
        isRead: isRead === undefined ? undefined : isRead === "true"
    })

    res.json(result)
}

export async function markNotificationReadController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const notificationId = parseId(req.params.id)
    await markNotificationRead(userId, notificationId)
    res.status(204).end()
}
