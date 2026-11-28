import { Router } from "express"
import { getNotificationsController, markNotificationReadController } from "../controllers/notification.controller.js"
import requireAuth from "../middlewares/requireAuth.js"

const router = Router()

router.get('/', requireAuth, getNotificationsController)
router.patch('/:id/read', requireAuth, markNotificationReadController)

export default router
