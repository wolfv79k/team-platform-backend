import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { createProjectController, deleteProjectController, getProjectController, getProjectsController, updateProjectController } from '../controllers/project.controller.js'

const router = Router()

router.post('/', requireAuth, createProjectController)
router.get('/:id', getProjectController)
router.get('/', getProjectsController)
router.patch('/:id', requireAuth, updateProjectController)
router.delete('/:id', requireAuth, deleteProjectController)

export default router