import type { NextFunction, Request, Response } from 'express'
import AUTH_INTERNAL_SECRET from '../config/oauth.js'
import { AppError } from '../utils/AppError.js'

export default function requireInternalSecret(req: Request, res: Response, next: NextFunction) {
    const secret = req.headers['x-internal-secret']

    if (!secret || secret !== AUTH_INTERNAL_SECRET) {
        throw new AppError('Доступ запрещен', 401)
    }

    next()

}