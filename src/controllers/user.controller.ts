import { getUserByUsername, removeUserSkill, setUserSkill, updateAvatar, updateMe } from "../services/user.service.js"
import type { Request, Response } from 'express'
import { AppError } from "../utils/AppError.js"
import { SkillLevel, SocialPlatform } from "../generated/prisma/enums.js"
import { parseId } from "../utils/parseId.js"
import { removeSocialLinks, setUserSocialLinks } from "../services/user.service.js"

function parsePlatform(value: unknown): SocialPlatform {
    if (typeof value !== "string") {
        throw new AppError("Неизвестная платформа", 400)
    }

    const platform = value.toUpperCase()

    if (!(Object.values(SocialPlatform) as string[]).includes(platform)) {
        throw new AppError("Неизвестная платформа", 400)
    }

    return platform as SocialPlatform
}

export async function getUserController(req: Request, res: Response) {
    const username = req.params.username

    if (typeof username !== 'string') {
        throw new AppError("Некорректный username", 400)
    }

    const result = await getUserByUsername(username)
    res.json(result)
}

export async function updateMeController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }
    const { name, bio, username, locationId, websiteUrl, resumeUrl } = req.body ?? {}

    if (name !== undefined && typeof name !== 'string') {
        throw new AppError("Неверный формат имени", 400)
    }

    if (bio !== undefined && typeof bio !== 'string') {
        throw new AppError("Неверный формат описания", 400)
    }

    if (username !== undefined && (typeof username !== 'string' || !/^[a-z0-9_]+$/.test(username))) {
        throw new AppError("Неверный формат имени пользователя (используйте a-z, 0-9, _)", 400)
    }

    if (locationId !== undefined && !Number.isInteger(locationId)) {
        throw new AppError("Некорректный город", 400)
    }

    if (websiteUrl !== undefined && (typeof websiteUrl !== 'string' || websiteUrl.length > 500)) {
        throw new AppError("Неверный формат сайта", 400)
    }

    if (resumeUrl !== undefined && (typeof resumeUrl !== 'string' || resumeUrl.length > 500)) {
        throw new AppError("Неверный формат резюме", 400)
    }

    const result = await updateMe(userId, { name, bio, username, locationId, websiteUrl, resumeUrl })
    res.json(result)
}

export async function setUserSkillController(req: Request, res: Response) {
    const userId = req.userId
    const { skillLevel } = req.body ?? {}

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    if (skillLevel !== undefined && !Object.values(SkillLevel).includes(skillLevel)) {
        throw new AppError("Неверный уровень навыка", 400)
    }

    const id = parseId(req.params.skillId)

    const result = await setUserSkill(userId, id, skillLevel)
    res.json(result)
}

export async function removeUserSkillController(req: Request, res: Response) {
    const userId = req.userId

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const id = parseId(req.params.skillId)

    await removeUserSkill(userId, id)
    res.status(204).end()
}

export async function updateAvatarController(req: Request, res: Response) {
    const userId = req.userId
    const file = req.file

    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    if (!file) {
        throw new AppError("Файл не передан", 400)

    }

    const result = await updateAvatar(userId, file)
    res.json(result)
}

export async function setUserSocialLinkController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const platform = parsePlatform(req.params.platform)
    const { url } = req.body ?? {}

    if (typeof url !== "string" || url.trim() === "" || url.length > 500) {
        throw new AppError("Ссылка обязательна, до 500 символов", 400)
    }

    const result = await setUserSocialLinks(userId, platform, url.trim())
    res.json(result)
}

export async function removeUserSocialLinkController(req: Request, res: Response) {
    const userId = req.userId
    if (!userId) {
        throw new AppError("Требуется авторизация", 401)
    }

    const platform = parsePlatform(req.params.platform)

    await removeSocialLinks(userId, platform)
    res.status(204).end()
}