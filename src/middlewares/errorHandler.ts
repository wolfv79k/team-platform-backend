import type { NextFunction, Request, Response } from 'express'


export default function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
};