import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { createProjectController, getProjectController, getProjectsController, updateProjectController } from '../controllers/project.controller.js'

const router = Router()

router.post('/', requireAuth, createProjectController)
router.get('/:id', getProjectController)
router.get('/', getProjectsController)
router.patch('/:id', requireAuth, updateProjectController)

export default router