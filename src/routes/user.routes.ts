import { getUserController } from "../controllers/user.controller.js"
import { Router } from 'express'

const router = Router()

router.get('/:username', getUserController)

export default router