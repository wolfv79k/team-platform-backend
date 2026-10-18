import { register, login, getMe } from "../services/auth.service.js"
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

export async function meController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }
    const result = await getMe(userId)
    res.json(result)
}