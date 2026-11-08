import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { changeMemberRoleController, createProjectController, deleteProjectController, getProjectController, getProjectsController, leaveProjectController, removeProjectMemberController, removeProjectOpenRoleController, removeProjectSkillController, setProjectOpenRoleController, setProjectSkillController, updateMyContributionController, updateProjectController } from '../controllers/project.controller.js'

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
router.delete('/:id/members/me', requireAuth, leaveProjectController)
router.delete('/:id/members/:userId', requireAuth, removeProjectMemberController)
router.patch('/:id/members/me', requireAuth, updateMyContributionController)
router.patch('/:id/members/:userId', requireAuth, changeMemberRoleController)

export default router