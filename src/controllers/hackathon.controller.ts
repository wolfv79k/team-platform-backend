import type { Request, Response } from "express"
import { createHackathon, getHackathonById, getHackathons, registerHackathonTeam } from "../services/hackathon.service.js"
import { AppError } from "../utils/AppError.js"
import { parseId } from "../utils/parseId.js"
import { parsePagination } from "../utils/parsePagination.js"

const ISO_DATE_TIME = /^(?!0000)\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/

function parseDate(value: unknown, field: string) {
    if (typeof value !== "string" || !ISO_DATE_TIME.test(value)) {
        throw new AppError(`Укажите ${field} в формате ISO 8601 с часовым поясом`, 400)
    }

    const date = new Date(value)
    const calendarDay = value.slice(0, 10)
    const utcMidnight = new Date(`${calendarDay}T00:00:00Z`)

    if (Number.isNaN(date.getTime()) || Number.isNaN(utcMidnight.getTime()) || utcMidnight.toISOString().slice(0, 10) !== calendarDay) {
        throw new AppError(`Некорректная дата в поле ${field}`, 400)
    }

    return date
}

function parseOptionalText(value: unknown, field: string, maxLength?: number) {
    if (value == null) {
        return undefined
    }

    if (typeof value !== "string" || value.includes("\0")) {
        throw new AppError(`Некорректное поле ${field}`, 400)
    }

    const text = value.trim()

    if (maxLength !== undefined && [...text].length > maxLength) {
        throw new AppError(`Поле ${field} должно содержать до ${maxLength} символов`, 400)
    }

    return text || undefined
}

export async function getHackathonsController(req: Request, res: Response) {
    const result = await getHackathons(parsePagination(req.query))
    res.json(result)
}

export async function getHackathonByIdController(req: Request, res: Response) {
    const hackathonId = parseId(req.params.id)
    const result = await getHackathonById(hackathonId)
    res.json(result)
}

export async function createHackathonController(req: Request, res: Response) {
    const { name, description, startDate, endDate, registrationDeadline, location, organizerUrl } = req.body ?? {}
    const trimmedName = parseOptionalText(name, "name", 255)
    const url = parseOptionalText(organizerUrl, "organizerUrl", 500)

    if (!trimmedName) {
        throw new AppError("Название хакатона обязательно", 400)
    }

    if (url && (!/^https?:\/\//i.test(url) || !URL.canParse(url))) {
        throw new AppError("Укажите корректную ссылку организатора", 400)
    }

    const result = await createHackathon({
        name: trimmedName,
        description: parseOptionalText(description, "description"),
        startDate: parseDate(startDate, "startDate"),
        endDate: parseDate(endDate, "endDate"),
        registrationDeadline: parseDate(registrationDeadline, "registrationDeadline"),
        location: parseOptionalText(location, "location", 255),
        organizerUrl: url
    })

    res.status(201).json(result)
}

export async function registerHackathonTeamController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const hackathonId = parseId(req.params.id)
    const teamId = parseId(req.params.teamId)
    await registerHackathonTeam(userId, hackathonId, teamId)
    res.status(204).end()
}
