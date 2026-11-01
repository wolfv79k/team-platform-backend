import { getUserByUsername, updateMe } from "../services/user.service.js"
import type { Request, Response } from 'express'
import { AppError } from "../utils/AppError.js"

export async function getUserController(req: Request, res: Response) {
    const username = req.params.username

    if (typeof username !== 'string') {
        throw new AppError("Некорректный username", 400)
    }

    const result = await getUserByUsername(username)
    res.json(result)
}

export async function updateMeController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }
    const { name, bio, username, locationId } = req.body ?? {}

    if (name !== undefined && typeof name !== 'string') {
        throw new AppError("Неверный формат имени", 400)
    }

    if (bio !== undefined && typeof bio !== 'string') {
        throw new AppError("Неверный формат описания", 400)
    }

    if (username !== undefined && (typeof username !== 'string' || !/^[a-z0-9_]+$/.test(username))) {
        throw new AppError("Неверный формат имени пользователя (используйте a-z, 0-9, _)", 400)
    }

    if (locationId !== undefined && typeof locationId !== 'number') {
        throw new AppError("Некорректный город", 400)
    }

    const result = await updateMe(userId, { name, bio, username, locationId })
    res.json(result)
}