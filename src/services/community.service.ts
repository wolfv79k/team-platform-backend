import prisma from "../config/db.js"
import type { CommunityRole } from "../generated/prisma/client.js"
import { Prisma } from "../generated/prisma/client.js"
import { AppError } from "../utils/AppError.js"
import { PUBLIC_USER_OMIT } from "../utils/publicUser.js"

export const COMMUNITY_DETAILS_INCLUDE = {
    creator: { omit: PUBLIC_USER_OMIT },
    _count: {
        select: { communityMembers: true }
    }
} as const

async function getOwnedCommunity(userId: number, communityId: number) {
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    })

    if (!community) {
        throw new AppError("Сообщество не найдено", 404)
    }

    if (community.creatorId !== userId) {
        throw new AppError("Действие доступно только создателю сообщества", 403)
    }

    return community
}

export async function createCommunity(creatorId: number, data: { name: string, description?: string }) {
    const { name, description } = data

    try {
        return await prisma.community.create({
            data: {
                name,
                description,
                creatorId,
                communityMembers: {
                    create: { userId: creatorId, role: "MODERATOR" }
                }
            },
            include: {
                communityMembers: {
                    include: {
                        user: { omit: PUBLIC_USER_OMIT }
                    }
                }
            }
        })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError("Сообщество с таким названием уже существует", 409)
        }

        throw error
    }
}

export async function getCommunityById(communityId: number) {
    const community = await prisma.community.findUnique({
        where: { id: communityId },
        include: COMMUNITY_DETAILS_INCLUDE
    })

    if (!community) {
        throw new AppError("Сообщество не найден", 404)
    }

    const { _count, ...details } = community
    return { ...details, membersCount: _count.communityMembers }
}

export async function getCommunities(data: { search?: string, page: number, limit: number }) {
    const { search, page, limit } = data

    const where: Prisma.CommunityWhereInput = {}

    if (search) {
        where.name = { contains: search, mode: "insensitive" }
    }

    const [communities, total] = await Promise.all([
        prisma.community.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: COMMUNITY_DETAILS_INCLUDE
        }),
        prisma.community.count({ where })
    ])

    const items = communities.map(({ _count, ...community }) => ({
        ...community,
        membersCount: _count.communityMembers
    }))

    return { items, total, page, limit }
}

export async function updateCommunity(userId: number, communityId: number, data: { name?: string, description?: string }) {
    await getOwnedCommunity(userId, communityId)

    try {
        const updated = await prisma.community.update({
            where: { id: communityId },
            data,
            include: COMMUNITY_DETAILS_INCLUDE
        })

        const { _count, ...details } = updated
        return { ...details, membersCount: _count.communityMembers }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError("Сообщество с таким названием уже существует", 409)
        }

        throw error
    }
}

export async function deleteCommunity(userId: number, communityId: number) {
    await getOwnedCommunity(userId, communityId)

    await prisma.$transaction(async (tx) => {
        await tx.comment.deleteMany({
            where: { post: { communityId } }
        })

        await tx.post.deleteMany({
            where: { communityId }
        })

        await tx.communityMember.deleteMany({
            where: { communityId }
        })

        await tx.community.delete({
            where: { id: communityId }
        })
    })
}

export async function joinCommunity(userId: number, communityId: number) {

    const community = await prisma.community.findUnique({
        where: { id: communityId }
    })

    if (!community) {
        throw new AppError("Сообщество не найдено", 404)
    }

    const result = await prisma.communityMember.upsert({
        where: { userId_communityId: { userId, communityId } },
        create: {
            communityId, userId, role: "MEMBER"
        },
        update: {}
    })

    return result
}

export async function leaveCommunity(userId: number, communityId: number) {
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    })

    if (!community) {
        throw new AppError("Сообщество не найдено", 404)
    }

    if (community.creatorId === userId) {
        throw new AppError("Создатель не может выйти из сообщества", 409)
    }

    const result = await prisma.communityMember.deleteMany({
        where: { userId, communityId }
    })

    if (result.count === 0) {
        throw new AppError("Вы не участник сообщества", 404)
    }
}