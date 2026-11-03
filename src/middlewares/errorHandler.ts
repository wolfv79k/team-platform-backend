import type { NextFunction, Request, Response } from 'express'
import { AppError } from "../utils/AppError.js"
import multer from 'multer'


export default function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message })
    } else if (err instanceof multer.MulterError) {
        res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Файл больше 4Мб' : err.message })
    } else {
        console.error(err)
        res.status(500).json({ error: 'Internal server error' })
    }
};