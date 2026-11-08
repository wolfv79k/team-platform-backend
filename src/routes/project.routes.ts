import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { createProjectController, deleteProjectController, getProjectController, getProjectsController, removeProjectSkillController, setProjectSkillController, updateProjectController } from '../controllers/project.controller.js'

const router = Router()

router.post('/', requireAuth, createProjectController)
router.get('/:id', getProjectController)
router.get('/', getProjectsController)
router.patch('/:id', requireAuth, updateProjectController)
router.delete('/:id', requireAuth, deleteProjectController)
router.put('/:id/skills/:skillId', requireAuth, setProjectSkillController)
router.delete('/:id/skills/:skillId', requireAuth, removeProjectSkillController)

export default router