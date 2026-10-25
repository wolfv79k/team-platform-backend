import { getSkills, getRoles, getLocations } from "../services/dictionary.service.js"
import type { Request, Response } from 'express'

export async function skillsController(_req: Request, res: Response) {
    const result = await getSkills()
    res.json(result)
}

export async function rolesController(_req: Request, res: Response) {
    const result = await getRoles()
    res.json(result)
}

export async function locationsController(_req: Request, res: Response) {
    const result = await getLocations()
    res.json(result)
}