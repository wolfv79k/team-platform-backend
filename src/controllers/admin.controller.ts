import type { Request, Response } from "express"
import { deleteCommunityPostAsAdmin, deletePostCommentAsAdmin } from "../services/community.service.js"
import { parseId } from "../utils/parseId.js"

export async function deleteCommunityPostAsAdminController(req: Request, res: Response) {
    const communityId = parseId(req.params.id)
    const postId = parseId(req.params.postId)

    await deleteCommunityPostAsAdmin(communityId, postId)
    res.status(204).end()
}

export async function deletePostCommentAsAdminController(req: Request, res: Response) {
    const communityId = parseId(req.params.id)
    const postId = parseId(req.params.postId)
    const commentId = parseId(req.params.commentId)

    await deletePostCommentAsAdmin(communityId, postId, commentId)
    res.status(204).end()
}
