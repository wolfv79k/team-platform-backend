import { register, login, oAuthLogin, getMe } from "../services/auth.service.js"
import type { Request, Response } from 'express'
import { AppError } from "../utils/AppError.js"


export async function registerController(req: Request, res: Response) {
    const { email, username, password, locationId } = req.body
    const user = await register(email, username, password, locationId)
    res.status(201).json({ user, status: 'Created' })
}

export async function loginController(req: Request, res: Response) {
    const { email, password } = req.body
    const result = await login(email, password)
    res.json(result)
}

export async function oAuthController(req: Request, res: Response) {
    const { provider, providerAccountId, email, name, image, providerLogin } = req.body
    if (typeof provider !== 'string' || typeof providerAccountId !== 'string') {
        throw new AppError("Некорректный провайдер", 400)
    }
    const result = await oAuthLogin(provider, providerAccountId, name ?? null, email ?? null, image ?? null, providerLogin ?? null)
    res.json(result)
}

export async function meController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }
    const result = await getMe(userId)
    res.json(result)
}