import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { createProjectController, getProjectController } from '../controllers/project.controller.js'

const router = Router()

router.post('/', requireAuth, createProjectController)
router.get('/:id', getProjectController)

export default router