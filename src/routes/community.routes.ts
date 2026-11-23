import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import {
    createCommunityController, createCommunityPostController, createPostCommentController,
    deleteCommunityController, deleteCommunityPostController, deletePostCommentController,
    getCommunitiesController, getCommunityController, getCommunityPostsController, getPostCommentsController,
    joinCommunityController, leaveCommunityController, updateCommunityController
} from '../controllers/community.controller.js'

const router = Router()

router.post('/', requireAuth, createCommunityController)
router.get('/:id', getCommunityController)
router.get('/', getCommunitiesController)
router.patch('/:id', requireAuth, updateCommunityController)
router.delete('/:id', requireAuth, deleteCommunityController)
router.put('/:id/members/me', requireAuth, joinCommunityController)
router.delete('/:id/members/me', requireAuth, leaveCommunityController)

router.get('/:id/posts', getCommunityPostsController)
router.post('/:id/posts', requireAuth, createCommunityPostController)
router.delete('/:id/posts/:postId', requireAuth, deleteCommunityPostController)
router.get('/:id/posts/:postId/comments', getPostCommentsController)
router.post('/:id/posts/:postId/comments', requireAuth, createPostCommentController)
router.delete('/:id/posts/:postId/comments/:commentId', requireAuth, deletePostCommentController)

export default router
