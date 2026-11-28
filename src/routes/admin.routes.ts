import { Router } from "express"
import { deleteCommunityPostAsAdminController, deletePostCommentAsAdminController } from "../controllers/admin.controller.js"
import requireAdmin from "../middlewares/requireAdmin.js"
import requireAuth from "../middlewares/requireAuth.js"

const router = Router()

router.use(requireAuth, requireAdmin)
router.delete('/communities/:id/posts/:postId', deleteCommunityPostAsAdminController)
router.delete('/communities/:id/posts/:postId/comments/:commentId', deletePostCommentAsAdminController)

export default router
