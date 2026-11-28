import type { NextFunction, Request, Response } from "express"
import { AppError } from "../utils/AppError.js"
import { isAdmin } from "../utils/isAdmin.js"

export default async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    if (!(await isAdmin(userId))) {
        throw new AppError("Требуются права администратора", 403)
    }

    next()
}
