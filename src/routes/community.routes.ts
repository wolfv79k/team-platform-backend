import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { createCommunityController, deleteCommunityController, getCommunitiesController, getCommunityController, joinCommunityController, leaveCommunityController, updateCommunityController } from '../controllers/community.controller.js'

const router = Router()

router.post('/', requireAuth, createCommunityController)
router.get('/:id', getCommunityController)
router.get('/', getCommunitiesController)
router.patch('/:id', requireAuth, updateCommunityController)
router.delete('/:id', requireAuth, deleteCommunityController)
router.put('/:id/members/me', requireAuth, joinCommunityController)
router.delete('/:id/members/me', requireAuth, leaveCommunityController)


export default router