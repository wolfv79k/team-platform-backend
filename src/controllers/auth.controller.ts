import { register, login, oAuthLogin, getMe } from "../services/auth.service.js"
import type { Request, Response } from 'express'
import { AppError } from "../utils/AppError.js"
import { resendVerification, verifyEmail } from "../services/emailVerification.service.js"
import { refreshSession, revokeRefreshSession } from "../services/refreshSession.service.js"

const RESEND_SOURCE_WINDOW_MS = 60_000
const RESEND_SOURCE_LIMIT = 5
const resendRequests = new Map<string, number>()

function parseEmail(email: unknown): string {
    if (typeof email !== "string" || email.length > 255 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) {
        throw new AppError("Укажите корректный email", 400)
    }

    return email
}

export async function registerController(req: Request, res: Response) {
    const { username, password, locationId } = req.body ?? {}
    const email = parseEmail(req.body?.email)

    if (typeof username !== "string" || !username.trim() || username.length > 50 ||
        typeof password !== "string" || password.length === 0 ||
        (locationId != null && (!Number.isInteger(locationId) || locationId < 1 || locationId > 2_147_483_647))) {
        throw new AppError("Некорректные данные регистрации", 400)
    }

    const { user, verificationEmailSent } = await register(email, username, password, locationId)
    res.status(201).json({ user, status: 'Created', verificationEmailSent })
}

export async function verifyEmailController(req: Request, res: Response) {
    const email = parseEmail(req.body?.email)
    const code = req.body?.code

    if (typeof code !== "string" || !/^[0-9]{6}$/.test(code)) {
        throw new AppError("Укажите шестизначный код", 400)
    }

    await verifyEmail(email, code)
    res.status(204).end()
}

export async function resendVerificationController(req: Request, res: Response) {
    const email = parseEmail(req.body?.email)
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown"
    const requestCount = resendRequests.get(ip) ?? 0

    if (requestCount < RESEND_SOURCE_LIMIT) {
        if (requestCount === 0) {
            setTimeout(() => resendRequests.delete(ip), RESEND_SOURCE_WINDOW_MS).unref()
        }

        resendRequests.set(ip, requestCount + 1)
        await resendVerification(email)
    }

    res.status(202).json({ status: "Accepted" })
}

export async function loginController(req: Request, res: Response) {
    const { email, password } = req.body ?? {}

    if (typeof email !== "string" || typeof password !== "string") {
        throw new AppError("Неверные почта или пароль", 401)
    }

    const result = await login(email, password)
    res.set("Cache-Control", "no-store").json(result)
}

export async function oAuthController(req: Request, res: Response) {
    const { provider, providerAccountId, email, name, image, providerLogin } = req.body
    if (typeof provider !== 'string' || typeof providerAccountId !== 'string') {
        throw new AppError("Некорректный провайдер", 400)
    }
    const result = await oAuthLogin(provider, providerAccountId, name ?? null, email ?? null, image ?? null, providerLogin ?? null)
    res.set("Cache-Control", "no-store").json(result)
}

export async function refreshController(req: Request, res: Response) {
    const result = await refreshSession(req.body?.refreshToken)
    res.set("Cache-Control", "no-store").json(result)
}

export async function logoutController(req: Request, res: Response) {
    await revokeRefreshSession(req.body?.refreshToken)
    res.status(204).end()
}

export async function meController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }
    const result = await getMe(userId)
    res.json(result)
}
