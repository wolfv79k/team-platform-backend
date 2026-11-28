import type { Request } from "express"
import { parseId } from "./parseId.js"

export function parsePagination(query: Request["query"]) {
    const { page, limit } = query
    const pageNum = page === undefined ? 1 : parseId(page)
    const limitNum = limit === undefined ? 10 : Math.min(parseId(limit), 50)

    return { page: pageNum, limit: limitNum }
}
