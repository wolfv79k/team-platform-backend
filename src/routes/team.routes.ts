import { Router } from "express"
import { getMyTeamsController } from "../controllers/team.controller.js"
import requireAuth from "../middlewares/requireAuth.js"

const router = Router()

router.get('/me', requireAuth, getMyTeamsController)

export default router
