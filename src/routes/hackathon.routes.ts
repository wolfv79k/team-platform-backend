import { Router } from "express"
import { createHackathonController, getHackathonByIdController, getHackathonsController, registerHackathonTeamController } from "../controllers/hackathon.controller.js"
import requireAdmin from "../middlewares/requireAdmin.js"
import requireAuth from "../middlewares/requireAuth.js"

const router = Router()

router.get('/', getHackathonsController)
router.get('/:id', getHackathonByIdController)
router.post('/', requireAuth, requireAdmin, createHackathonController)
router.put('/:id/teams/:teamId', requireAuth, registerHackathonTeamController)

export default router
