import type { Request, Response } from "express"
import { getMyTeams } from "../services/team.service.js"
import { AppError } from "../utils/AppError.js"
import { parsePagination } from "../utils/parsePagination.js"

export async function getMyTeamsController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const result = await getMyTeams(userId, parsePagination(req.query))
    res.json(result)
}
