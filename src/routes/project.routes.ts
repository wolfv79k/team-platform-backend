import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { createProjectController, deleteProjectController, getProjectController, getProjectsController, removeProjectOpenRoleController, removeProjectSkillController, setProjectOpenRoleController, setProjectSkillController, updateProjectController } from '../controllers/project.controller.js'

const router = Router()

router.post('/', requireAuth, createProjectController)
router.get('/:id', getProjectController)
router.get('/', getProjectsController)
router.patch('/:id', requireAuth, updateProjectController)
router.delete('/:id', requireAuth, deleteProjectController)
router.put('/:id/skills/:skillId', requireAuth, setProjectSkillController)
router.delete('/:id/skills/:skillId', requireAuth, removeProjectSkillController)
router.put('/:id/roles/:roleId', requireAuth, setProjectOpenRoleController)
router.delete('/:id/roles/:roleId', requireAuth, removeProjectOpenRoleController)

export default router