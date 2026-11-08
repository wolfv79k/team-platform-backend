import type { Request, Response } from "express"
import { AppError } from "../utils/AppError.js"
import { createProject, deleteProject, getProjectById, getProjects, updateProject } from "../services/project.service.js"
import { parseId } from "../utils/parseId.js"
import { ProjectStatus } from "../generated/prisma/enums.js"

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

export async function getProjectController(req: Request, res: Response) {
    const id = parseId(req.params.id)

    const result = await getProjectById(id)
    res.json(result)
}

export async function getProjectsController(req: Request, res: Response) {
    const { status, skillId, roleId, search, page, limit } = req.query

    if (status !== undefined && (typeof status !== "string" || !(Object.values(ProjectStatus) as string[]).includes(status))) {
        throw new AppError("Неверный статус", 400)
    }

    if (search !== undefined && typeof search !== "string") {
        throw new AppError("Неверный поиск", 400)
    }

    const skillIdNum = skillId === undefined ? undefined : parseId(skillId)
    const roleIdNum = roleId === undefined ? undefined : parseId(roleId)
    const pageNum = page === undefined ? 1 : parseId(page)
    const limitNum = limit === undefined ? 10 : Math.min(parseId(limit), 50)

    const result = await getProjects({
        status: status as ProjectStatus | undefined,
        skillId: skillIdNum,
        roleId: roleIdNum,
        search: search?.trim() || undefined,
        page: pageNum,
        limit: limitNum
    })

    res.json(result)
}

export async function updateProjectController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const projectId = parseId(req.params.id)

    const { name, status, description, slogan, projectUrl, videoUrl, partners } = req.body ?? {}

    if (name !== undefined && (typeof name !== "string" || name.trim() === '' || name.length > 100)) {
        throw new AppError("Название не должно быть пустым, до 100 символов", 400)
    }

    if (status !== undefined && (typeof status !== "string" || !(Object.values(ProjectStatus) as string[]).includes(status))) {
        throw new AppError("Неверный статус", 400)
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

    const result = await updateProject(userId, projectId, { name, status, description, slogan, projectUrl, videoUrl, partners })
    res.json(result)
}

export async function deleteProjectController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const projectId = parseId(req.params.id)

    await deleteProject(userId, projectId)
    res.status(204).end()
}