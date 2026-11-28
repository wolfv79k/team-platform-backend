import prisma from "../config/db.js"

export async function getMyTeams(captainId: number, data: { page: number, limit: number }) {
    const { page, limit } = data
    const where = { captainId }

    const [items, total] = await Promise.all([
        prisma.team.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit
        }),
        prisma.team.count({ where })
    ])

    return { items, total, page, limit }
}
