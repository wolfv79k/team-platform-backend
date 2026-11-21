import type { Request, Response } from "express"
import { AppError } from "../utils/AppError.js"
import { parseId } from "../utils/parseId.js"
import { createCommunity, deleteCommunity, getCommunities, getCommunityById, joinCommunity, leaveCommunity, updateCommunity } from "../services/community.service.js"

export async function createCommunityController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const { name, description } = req.body ?? {}

    if (typeof name !== "string") {
        throw new AppError("Название обязательно, до 100 символов", 400)
    }

    const trimmedName = name.trim()

    if (trimmedName.length === 0 || trimmedName.length > 100) {
        throw new AppError("Название обязательно, до 100 символов", 400)
    }

    if (description !== undefined && typeof description !== 'string') {
        throw new AppError("Некорректное описание", 400)
    }

    const result = await createCommunity(userId, { name: trimmedName, description })
    res.status(201).json(result)
}

export async function getCommunityController(req: Request, res: Response) {
    const id = parseId(req.params.id)

    const result = await getCommunityById(id)
    res.json(result)
}

export async function getCommunitiesController(req: Request, res: Response) {
    const { search, page, limit } = req.query

    if (search !== undefined && typeof search !== "string") {
        throw new AppError("Неверный поиск", 400)
    }

    const pageNum = page === undefined ? 1 : parseId(page)
    const limitNum = limit === undefined ? 10 : Math.min(parseId(limit), 50)

    const result = await getCommunities({
        search: search?.trim() || undefined,
        page: pageNum,
        limit: limitNum
    })

    res.json(result)
}

export async function updateCommunityController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const communityId = parseId(req.params.id)
    const { name, description } = req.body ?? {}

    if (name === undefined && description === undefined) {
        throw new AppError("Укажите название или описание", 400)
    }

    let trimmedName: string | undefined

    if (name !== undefined) {
        if (typeof name !== "string") {
            throw new AppError("Название не должно быть пустым, до 100 символов", 400)
        }

        trimmedName = name.trim()

        if (trimmedName.length === 0 || trimmedName.length > 100) {
            throw new AppError("Название не должно быть пустым, до 100 символов", 400)
        }
    }

    if (description !== undefined && typeof description !== "string") {
        throw new AppError("Некорректное описание", 400)
    }

    const result = await updateCommunity(userId, communityId, {
        name: trimmedName,
        description
    })

    res.json(result)
}

export async function deleteCommunityController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const projectId = parseId(req.params.id)

    await deleteCommunity(userId, projectId)
    res.status(204).end()
}

export async function joinCommunityController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const communityId = parseId(req.params.id)

    await joinCommunity(userId, communityId)
    res.status(204).end()
}

export async function leaveCommunityController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const communityId = parseId(req.params.id)

    await leaveCommunity(userId, communityId)
    res.status(204).end()
}