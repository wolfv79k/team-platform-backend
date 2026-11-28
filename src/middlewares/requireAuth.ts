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
        const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] })

        // Старые access JWT выпущены без purpose и действуют до исходного exp.
        if (typeof payload === "string" || (payload.purpose !== undefined && payload.purpose !== "access") ||
            typeof payload.userId !== "number" || !Number.isInteger(payload.userId) ||
            payload.userId <= 0 || payload.userId > 2_147_483_647 || typeof payload.exp !== "number") {
            throw new AppError("Токен недействителен", 401)
        }

        req.userId = payload.userId
    } catch {
        throw new AppError("Токен недействителен", 401)
    }

    next()
}
