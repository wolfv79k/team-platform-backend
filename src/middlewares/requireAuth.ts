import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import JWT_SECRET from '../config/jwt.js'
import { AppError } from '../utils/AppError.js'

export default function requireAuth(req: Request, res: Response, next: NextFunction) {
    const fullToken = req.headers.authorization
    if (!fullToken || !fullToken.startsWith("Bearer ")) {
        throw new AppError("Требуется авторизация", 401)
    }

    const parts = fullToken.split(" ")
    const token = parts[1]

    if (!token) {
        throw new AppError("Требуется авторизация", 401)
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
        req.userId = payload.userId
    } catch {
        throw new AppError("Токен недействителен", 401)
    }

    next()
}