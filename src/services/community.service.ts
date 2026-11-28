import prisma from "../config/db.js"
import { Prisma } from "../generated/prisma/client.js"
import { AppError } from "../utils/AppError.js"
import { PUBLIC_USER_OMIT } from "../utils/publicUser.js"

export const COMMUNITY_DETAILS_INCLUDE = {
    creator: { omit: PUBLIC_USER_OMIT },
    _count: {
        select: { communityMembers: true }
    }
} as const

const COMMUNITY_CONTENT_INCLUDE = {
    author: { omit: PUBLIC_USER_OMIT }
} as const

async function getCommunityOrThrow(communityId: number) {
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    })

    if (!community) {
        throw new AppError("Сообщество не найдено", 404)
    }

    return community
}

async function getOwnedCommunity(userId: number, communityId: number) {
    const community = await getCommunityOrThrow(communityId)

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
        const [community] = await tx.$queryRaw<{ id: number }[]>`
            SELECT "id" FROM "Community" WHERE "id" = ${communityId} FOR UPDATE
        `

        if (!community) {
            throw new AppError("Сообщество не найдено", 404)
        }

        // При удалении поста и сообщества посты блокируются до удаления комментариев.
        await tx.$queryRaw`
            SELECT "id" FROM "Post" WHERE "communityId" = ${communityId}
            ORDER BY "id" FOR UPDATE
        `

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

async function getCommunityPost(communityId: number, postId: number) {
    const post = await prisma.post.findUnique({
        where: { id: postId, communityId },
        include: { community: { select: { creatorId: true } } }
    })

    if (!post) {
        throw new AppError("Пост не найден", 404)
    }

    return post
}

async function getCommunityMember(userId: number, communityId: number) {
    return prisma.communityMember.findUnique({
        where: { userId_communityId: { userId, communityId } },
        select: { role: true }
    })
}

export async function getCommunityPosts(communityId: number, data: { page: number, limit: number }) {
    const { page, limit } = data
    await getCommunityOrThrow(communityId)

    const [items, total] = await Promise.all([
        prisma.post.findMany({
            where: { communityId },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
            include: COMMUNITY_CONTENT_INCLUDE
        }),
        prisma.post.count({ where: { communityId } })
    ])

    return { items, total, page, limit }
}

export async function createCommunityPost(userId: number, communityId: number, data: { text: string, title?: string }) {
    await getCommunityOrThrow(communityId)

    const member = await getCommunityMember(userId, communityId)
    if (!member) {
        throw new AppError("Публиковать посты могут только участники сообщества", 403)
    }

    const { text, title } = data

    return prisma.post.create({
        data: { communityId, authorId: userId, text, title },
        include: COMMUNITY_CONTENT_INCLUDE
    }).catch(async (error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            await getCommunityOrThrow(communityId)
        }

        throw error
    })
}

export async function deleteCommunityPost(userId: number, communityId: number, postId: number) {
    const post = await getCommunityPost(communityId, postId)

    if (post.authorId !== userId && post.community.creatorId !== userId) {
        throw new AppError("Удалить пост может только его автор или создатель сообщества", 403)
    }

    await deletePostWithComments(communityId, postId)
}

export async function deleteCommunityPostAsAdmin(communityId: number, postId: number) {
    await deletePostWithComments(communityId, postId)
}

async function deletePostWithComments(communityId: number, postId: number) {
    await prisma.$transaction(async (tx) => {
        // Блокировка поста не даёт добавить к нему комментарий между двумя удалениями.
        const [lockedPost] = await tx.$queryRaw<{ id: number }[]>`
            SELECT "id" FROM "Post"
            WHERE "id" = ${postId} AND "communityId" = ${communityId}
            FOR UPDATE
        `

        if (!lockedPost) {
            throw new AppError("Пост не найден", 404)
        }

        await tx.comment.deleteMany({
            where: { postId }
        })

        await tx.post.delete({
            where: { id: postId }
        })
    })
}

export async function getPostComments(communityId: number, postId: number, data: { page: number, limit: number }) {
    const { page, limit } = data
    await getCommunityPost(communityId, postId)

    const [items, total] = await Promise.all([
        prisma.comment.findMany({
            where: { postId },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            skip: (page - 1) * limit,
            take: limit,
            include: COMMUNITY_CONTENT_INCLUDE
        }),
        prisma.comment.count({ where: { postId } })
    ])

    return { items, total, page, limit }
}

export async function createPostComment(userId: number, communityId: number, postId: number, text: string) {
    await getCommunityPost(communityId, postId)

    const member = await getCommunityMember(userId, communityId)
    if (!member) {
        throw new AppError("Комментировать могут только участники сообщества", 403)
    }

    return prisma.comment.create({
        data: { postId, authorId: userId, text },
        include: COMMUNITY_CONTENT_INCLUDE
    }).catch(async (error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            await getCommunityPost(communityId, postId)
        }

        throw error
    })
}

export async function deletePostComment(userId: number, communityId: number, postId: number, commentId: number) {
    const post = await getCommunityPost(communityId, postId)
    const comment = await prisma.comment.findUnique({
        where: { id: commentId, postId },
        select: { authorId: true }
    })

    if (!comment) {
        throw new AppError("Комментарий не найден", 404)
    }

    if (comment.authorId !== userId && post.community.creatorId !== userId) {
        const member = await getCommunityMember(userId, communityId)

        if (member?.role !== "MODERATOR") {
            throw new AppError("Недостаточно прав для удаления комментария", 403)
        }
    }

    await deleteComment(postId, commentId)
}

export async function deletePostCommentAsAdmin(communityId: number, postId: number, commentId: number) {
    await getCommunityPost(communityId, postId)
    await deleteComment(postId, commentId)
}

async function deleteComment(postId: number, commentId: number) {
    const result = await prisma.comment.deleteMany({
        where: { id: commentId, postId }
    })

    if (result.count === 0) {
        throw new AppError("Комментарий не найден", 404)
    }
}
