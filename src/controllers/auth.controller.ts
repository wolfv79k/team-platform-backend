import { register, login } from "../services/auth.service.js"
import type { Request, Response } from 'express'


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