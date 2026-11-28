import { createHash, randomUUID } from "node:crypto"
import jwt from "jsonwebtoken"
import prisma from "../config/db.js"
import JWT_SECRET, { getRefreshJwtSecret } from "../config/jwt.js"
import { AppError } from "../utils/AppError.js"

const ACCESS_LIFETIME_SECONDS = 15 * 60
const REFRESH_LIFETIME_SECONDS = 7 * 24 * 60 * 60
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex")
}

function createTokenPair(userId: number, sessionId: string, refreshExpiresAt: number, refreshSecret: string) {
    const accessExpiresAt = Math.floor(Date.now() / 1000) + ACCESS_LIFETIME_SECONDS
    const token = jwt.sign({ userId, purpose: "access", exp: accessExpiresAt }, JWT_SECRET, {
        algorithm: "HS256",
        jwtid: randomUUID()
    })
    const refreshToken = jwt.sign({
        userId,
        purpose: "refresh",
        sid: sessionId,
        exp: refreshExpiresAt
    }, refreshSecret, { algorithm: "HS256", jwtid: randomUUID() })

    return { token, refreshToken, accessTokenExpiresAt: new Date(accessExpiresAt * 1000).toISOString() }
}

function verifyRefreshToken(token: string, refreshSecret: string) {
    try {
        const payload = jwt.verify(token, refreshSecret, { algorithms: ["HS256"] })

        if (typeof payload === "string" || payload.purpose !== "refresh" ||
            typeof payload.userId !== "number" || !Number.isInteger(payload.userId) ||
            payload.userId <= 0 || payload.userId > 2_147_483_647 ||
            typeof payload.sid !== "string" || !SESSION_ID_PATTERN.test(payload.sid) ||
            typeof payload.exp !== "number" || !Number.isInteger(payload.exp)) {
            return null
        }

        return { userId: payload.userId, sessionId: payload.sid, expiresAt: payload.exp }
    } catch {
        return null
    }
}

export async function createRefreshSession(userId: number) {
    const secret = getRefreshJwtSecret()
    const sessionId = randomUUID()
    const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_LIFETIME_SECONDS
    const tokens = createTokenPair(userId, sessionId, expiresAt, secret)

    await prisma.refreshSession.create({
        data: {
            id: sessionId,
            userId,
            tokenHash: hashToken(tokens.refreshToken),
            expiresAt: new Date(expiresAt * 1000)
        }
    })

    return tokens
}

export async function refreshSession(refreshToken: unknown) {
    if (typeof refreshToken !== "string" || !refreshToken) {
        throw new AppError("Refresh-токен недействителен", 401)
    }

    const secret = getRefreshJwtSecret()
    const session = verifyRefreshToken(refreshToken, secret)

    if (!session) {
        throw new AppError("Refresh-токен недействителен", 401)
    }

    const { userId, sessionId, expiresAt } = session
    const tokens = createTokenPair(userId, sessionId, expiresAt, secret)

    // Только запрос с текущим хешем может заменить refresh-токен активной сессии.
    const updated = await prisma.refreshSession.updateMany({
        where: {
            id: sessionId,
            userId,
            tokenHash: hashToken(refreshToken),
            expiresAt: { gt: new Date() },
            revokedAt: null
        },
        data: { tokenHash: hashToken(tokens.refreshToken) }
    })

    if (updated.count === 0) {
        throw new AppError("Refresh-токен недействителен", 401)
    }

    return tokens
}

export async function revokeRefreshSession(refreshToken: unknown) {
    if (typeof refreshToken !== "string" || !refreshToken) {
        return
    }

    const session = verifyRefreshToken(refreshToken, getRefreshJwtSecret())

    if (!session) {
        return
    }

    // Отзываем всю сессию: параллельный refresh не должен отменить выход.
    await prisma.refreshSession.updateMany({
        where: { id: session.sessionId, userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() }
    })
}
