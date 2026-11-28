import { AppError } from "../utils/AppError.js"

const secret = process.env.JWT_SECRET

if (!secret) {
    throw new Error('JWT_SECRET не задан в .env')
}

const JWT_SECRET: string = secret

export function getRefreshJwtSecret() {
    const refreshSecret = process.env.JWT_REFRESH_SECRET

    if (!refreshSecret || refreshSecret === JWT_SECRET) {
        console.error("Задайте отдельный JWT_REFRESH_SECRET")
        throw new AppError("Сессии временно недоступны", 503)
    }

    return refreshSecret
}

export default JWT_SECRET
