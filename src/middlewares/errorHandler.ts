import type { NextFunction, Request, Response } from 'express'
import { AppError } from "../utils/AppError.js"


export default function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message })
    } else {
        console.error(err)
        res.status(500).json({ error: 'Internal server error' })
    }
};