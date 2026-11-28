import prisma from "../config/db.js"
import { AppError } from "../utils/AppError.js"

const ALREADY_REGISTERED_MESSAGE = "Вы уже записаны на этот хакатон"

export async function getHackathons(data: { page: number, limit: number }) {
    const { page, limit } = data
    const [items, total] = await Promise.all([
        prisma.hackathon.findMany({
            orderBy: [{ startDate: "asc" }, { id: "asc" }],
            skip: (page - 1) * limit,
            take: limit
        }),
        prisma.hackathon.count()
    ])

    return { items, total, page, limit }
}

export async function getHackathonById(hackathonId: number) {
    const hackathon = await prisma.hackathon.findUnique({
        where: { id: hackathonId }
    })

    if (!hackathon) {
        throw new AppError("Хакатон не найден", 404)
    }

    return hackathon
}

export async function createHackathon(data: {
    name: string
    description?: string
    startDate: Date
    endDate: Date
    registrationDeadline: Date
    location?: string
    organizerUrl?: string
}) {
    const { startDate, endDate, registrationDeadline } = data

    if (endDate <= startDate) {
        throw new AppError("Дата окончания должна быть позже начала хакатона", 400)
    }

    if (registrationDeadline > startDate) {
        throw new AppError("Дедлайн регистрации должен быть не позже начала хакатона", 400)
    }

    return prisma.hackathon.create({ data })
}

export async function registerHackathonTeam(userId: number, hackathonId: number, teamId: number) {
    const [hackathon, team] = await Promise.all([
        getHackathonById(hackathonId),
        prisma.team.findUnique({
            where: { id: teamId },
            select: { captainId: true }
        })
    ])

    if (!team) {
        throw new AppError("Команда не найдена", 404)
    }

    if (team.captainId !== userId) {
        throw new AppError("Зарегистрировать команду может только её капитан", 403)
    }

    const registration = { teamId, hackathonId }
    const existing = await prisma.hackathonTeam.findUnique({
        where: { teamId_hackathonId: registration },
        select: { teamId: true }
    })

    if (existing) {
        throw new AppError(ALREADY_REGISTERED_MESSAGE, 409)
    }

    if (hackathon.registrationDeadline.getTime() <= Date.now()) {
        throw new AppError("Регистрация на хакатон закрыта", 409)
    }

    const created = await prisma.hackathonTeam.createMany({
        data: registration,
        skipDuplicates: true
    })

    if (created.count === 0) {
        throw new AppError(ALREADY_REGISTERED_MESSAGE, 409)
    }
}
