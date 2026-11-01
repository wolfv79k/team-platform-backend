import { Router } from 'express'
import { loginController, meController, registerController, oAuthController } from '../controllers/auth.controller.js';
import requireAuth from '../middlewares/requireAuth.js';
import requireInternalSecret from '../middlewares/requireInternalSecret.js'

const router = Router()

router.post('/register', registerController)
router.post('/login', loginController)
router.post('/oauth', requireInternalSecret, oAuthController)
router.get('/me', requireAuth, meController)

export default router