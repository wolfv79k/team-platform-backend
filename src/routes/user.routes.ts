import { getUserController, updateMeController } from "../controllers/user.controller.js"
import { Router } from 'express'
import requireAuth from "../middlewares/requireAuth.js"

const router = Router()

router.get('/:username', getUserController)
router.patch('/me', requireAuth, updateMeController)

export default router