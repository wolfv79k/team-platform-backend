import type { Request, Response } from "express"
import { AppError } from "../utils/AppError.js"
import { parseId } from "../utils/parseId.js"
import { ApplicationStatus, ApplicationType } from "../generated/prisma/enums.js"
import { acceptApplication, applyToProject, declineApplication, getMyApplications, getProjectApplications, inviteToProject, withdrawApplication } from "../services/application.service.js"

function requireUserId(req: Request): number {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    return userId
}

function parseMessage(message: unknown): string | undefined {
    if (message === undefined) {
        return undefined
    }

    if (typeof message !== "string" || message.length > 1000) {
        throw new AppError("Сообщение должно быть строкой до 1000 символов", 400)
    }

    return message.trim() || undefined
}

// Фильтры ?status=PENDING&type=REQUEST для списков
function parseFilters(query: Request["query"]) {
    const { status, type } = query

    if (status !== undefined && (typeof status !== "string" || !(Object.values(ApplicationStatus) as string[]).includes(status))) {
        throw new AppError("Неверный статус", 400)
    }

    if (type !== undefined && (typeof type !== "string" || !(Object.values(ApplicationType) as string[]).includes(type))) {
        throw new AppError("Неверный тип заявки", 400)
    }

    return {
        status: status as ApplicationStatus | undefined,
        type: type as ApplicationType | undefined
    }
}

// POST /api/projects/:id/applications
export async function applyToProjectController(req: Request, res: Response) {
    const userId = requireUserId(req)
    const projectId = parseId(req.params.id)
    const { roleId, message } = req.body ?? {}

    if (!Number.isInteger(roleId)) {
        throw new AppError("Некорректно указана роль", 400)
    }

    const result = await applyToProject(userId, projectId, roleId, parseMessage(message))
    res.status(201).json(result)
}

// POST /api/projects/:id/invitations
export async function inviteToProjectController(req: Request, res: Response) {
    const authorId = requireUserId(req)
    const projectId = parseId(req.params.id)
    const { userId, roleId, message } = req.body ?? {}

    if (!Number.isInteger(userId)) {
        throw new AppError("Некорректно указан пользователь", 400)
    }

    if (!Number.isInteger(roleId)) {
        throw new AppError("Некорректно указана роль", 400)
    }

    const result = await inviteToProject(authorId, projectId, userId, roleId, parseMessage(message))
    res.status(201).json(result)
}

// GET /api/projects/:id/applications
export async function getProjectApplicationsController(req: Request, res: Response) {
    const userId = requireUserId(req)
    const projectId = parseId(req.params.id)

    const result = await getProjectApplications(userId, projectId, parseFilters(req.query))
    res.json(result)
}

// GET /api/users/me/applications
export async function getMyApplicationsController(req: Request, res: Response) {
    const userId = requireUserId(req)

    const result = await getMyApplications(userId, parseFilters(req.query))
    res.json(result)
}

// POST /api/applications/:id/accept
export async function acceptApplicationController(req: Request, res: Response) {
    const userId = requireUserId(req)
    const applicationId = parseId(req.params.id)

    const result = await acceptApplication(userId, applicationId)
    res.json(result)
}

// POST /api/applications/:id/decline
export async function declineApplicationController(req: Request, res: Response) {
    const userId = requireUserId(req)
    const applicationId = parseId(req.params.id)

    const result = await declineApplication(userId, applicationId)
    res.json(result)
}

// DELETE /api/applications/:id
export async function withdrawApplicationController(req: Request, res: Response) {
    const userId = requireUserId(req)
    const applicationId = parseId(req.params.id)

    await withdrawApplication(userId, applicationId)
    res.status(204).end()
}
