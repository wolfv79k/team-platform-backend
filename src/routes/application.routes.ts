import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { acceptApplicationController, declineApplicationController, withdrawApplicationController } from '../controllers/application.controller.js'

const router = Router()

router.post('/:id/accept', requireAuth, acceptApplicationController)
router.post('/:id/decline', requireAuth, declineApplicationController)
router.delete('/:id', requireAuth, withdrawApplicationController)

export default router
