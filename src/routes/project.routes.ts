import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { createProjectController } from '../controllers/project.controller.js'

const router = Router()

router.post('/', requireAuth, createProjectController)

export default router