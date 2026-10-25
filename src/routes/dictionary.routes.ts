import { Router } from 'express'
import { skillsController, rolesController, locationsController } from '../controllers/dictionary.controller.js'

const router = Router()

router.get('/skills', skillsController)
router.get('/roles', rolesController)
router.get('/locations', locationsController)

export default router