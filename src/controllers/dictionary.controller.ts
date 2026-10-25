import { getSkills, getRoles, getLocations } from "../services/dictionary.service.js"
import type { Request, Response } from 'express'

export async function skillsController(req: Request, res: Response) {
    const result = await getSkills()
    res.json(result)
}

export async function rolesController(req: Request, res: Response) {
    const result = await getRoles()
    res.json(result)
}

export async function locationsController(req: Request, res: Response) {
    const result = await getLocations()
    res.json(result)
}