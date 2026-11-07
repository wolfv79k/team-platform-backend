import type { Request, Response } from "express"
import { AppError } from "../utils/AppError.js"
import { createProject } from "../services/project.service.js"

export async function createProjectController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const { name, roleId, description, slogan, projectUrl, videoUrl, partners } = req.body ?? {}

    if (typeof name !== 'string' || name.trim() === '' || name.length > 100) {
        throw new AppError("Название обязательно, до 100 символов", 400)
    }

    if (description !== undefined && typeof description !== 'string') {
        throw new AppError("Некорректное описание", 400)
    }

    if (slogan !== undefined && (typeof slogan !== 'string' || slogan.length > 160)) {
        throw new AppError("Некорректный слоган, до 160 символов", 400)
    }

    if (projectUrl !== undefined && typeof projectUrl !== 'string') {
        throw new AppError("Некорректный URL проекта", 400)
    }

    if (videoUrl !== undefined && typeof videoUrl !== 'string') {
        throw new AppError("Некорректный URL видео", 400)
    }

    if (partners !== undefined && (!Array.isArray(partners) || !partners.every(p => typeof p === 'string'))) {
        throw new AppError("Некорректно указаны партнеры", 400)
    }

    if (!Number.isInteger(roleId)) {
        throw new AppError("Некорректно указана роль", 400)
    }

    const result = await createProject(userId, { name, roleId, description, slogan, projectUrl, videoUrl, partners })
    res.status(201).json(result)
}