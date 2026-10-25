import { getUserByUsername } from "../services/user.service.js"
import type { Request, Response } from 'express'
import { AppError } from "../utils/AppError.js"

export async function getUserController(req: Request, res: Response) {
    const username = req.params.username

    if (typeof username !== 'string') {
        throw new AppError("Некорректный username", 400)
    }

    const result = await getUserByUsername(username)
    res.json(result)
}