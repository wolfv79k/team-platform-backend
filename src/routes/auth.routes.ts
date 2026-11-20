import { Router } from 'express'
import { loginController, meController, registerController, oAuthController, verifyEmailController, resendVerificationController } from '../controllers/auth.controller.js'
import requireAuth from '../middlewares/requireAuth.js';
import requireInternalSecret from '../middlewares/requireInternalSecret.js'

const router = Router()

router.post('/register', registerController)
router.post('/verify-email', verifyEmailController)
router.post('/resend-verification', resendVerificationController)
router.post('/login', loginController)
router.post('/oauth', requireInternalSecret, oAuthController)
router.get('/me', requireAuth, meController)

export default router
