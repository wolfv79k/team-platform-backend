import { updateAvatarController, setUserSocialLinkController, removeUserSocialLinkController, getUserController, removeUserSkillController, setUserSkillController, updateMeController } from "../controllers/user.controller.js"
import { Router } from 'express'
import requireAuth from "../middlewares/requireAuth.js"
import upload from "../middlewares/upload.js"


const router = Router()

router.get('/:username', getUserController)
router.post('/me/avatar', requireAuth, upload.single('avatar'), updateAvatarController)
router.patch('/me', requireAuth, updateMeController)
router.put('/me/skills/:skillId', requireAuth, setUserSkillController)
router.delete('/me/skills/:skillId', requireAuth, removeUserSkillController)
router.put('/me/socials/:platform', requireAuth, setUserSocialLinkController)
router.delete('/me/socials/:platform', requireAuth, removeUserSocialLinkController)

export default router