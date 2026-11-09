import type { Request, Response } from "express"
import { AppError } from "../utils/AppError.js"
import { parseId } from "../utils/parseId.js"
import { convertIdeaToProject, createIdea, deleteIdea, getIdeaById, getIdeas, updateIdea } from "../services/idea.service.js"


export async function createIdeaController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const { name, description } = req.body ?? {}

    if (typeof name !== 'string' || name.trim() === '' || name.length > 100) {
        throw new AppError("Название обязательно, до 100 символов", 400)
    }

    if (description !== undefined && typeof description !== 'string') {
        throw new AppError("Некорректное описание", 400)
    }

    const result = await createIdea(userId, { name, description })
    res.status(201).json(result)
}

export async function getIdeaByIdController(req: Request, res: Response) {
    const id = parseId(req.params.id)

    const result = await getIdeaById(id)
    res.json(result)
}

export async function getIdeasController(req: Request, res: Response) {
    const { page, limit } = req.query

    const pageNum = page === undefined ? 1 : parseId(page)
    const limitNum = limit === undefined ? 10 : Math.min(parseId(limit), 50)

    const result = await getIdeas({
        page: pageNum,
        limit: limitNum
    })

    res.json(result)
}

export async function updateIdeaController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const ideaId = parseId(req.params.id)

    const { name, description } = req.body ?? {}

    if (name !== undefined && (typeof name !== "string" || name.trim() === '' || name.length > 100)) {
        throw new AppError("Название не должно быть пустым, до 100 символов", 400)
    }

    if (description !== undefined && typeof description !== 'string') {
        throw new AppError("Некорректное описание", 400)
    }

    const result = await updateIdea(userId, ideaId, { name, description })
    res.json(result)
}

export async function deleteIdeaController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const ideaId = parseId(req.params.id)

    await deleteIdea(userId, ideaId)
    res.status(204).end()
}

export async function convertIdeaToProjectController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const ideaId = parseId(req.params.id)
    const { roleId } = req.body ?? {}

    if (!Number.isInteger(roleId)) {
        throw new AppError("Некорректно указана роль", 401)
    }

    const result = await convertIdeaToProject(userId, ideaId, roleId)
    res.status(201).json(result)
}
