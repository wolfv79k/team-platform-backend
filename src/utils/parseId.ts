import { AppError } from "./AppError.js"

const MAX_POSTGRES_INT = 2_147_483_647

export function parseId(value: unknown): number {
    if (typeof value !== "string") {
        throw new AppError("Некорректный id", 400)
    }

    const id = Number(value)

    if (!Number.isInteger(id) || id <= 0 || id > MAX_POSTGRES_INT) {
        throw new AppError("Некорректный id", 400)
    }

    return id
}