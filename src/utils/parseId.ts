import { AppError } from "./AppError.js"

export function parseId(value: unknown): number {
    if (typeof value !== 'string') {
        throw new AppError("Некорректный id", 400)
    }

    const id = Number(value)

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Некорректный id", 400)
    }

    return id
}