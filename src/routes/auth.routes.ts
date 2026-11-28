import { Router } from 'express'
import {
    loginController, logoutController, meController, oAuthController, refreshController,
    registerController, resendVerificationController, verifyEmailController
} from '../controllers/auth.controller.js'
import requireAuth from '../middlewares/requireAuth.js';
import requireInternalSecret from '../middlewares/requireInternalSecret.js'

const router = Router()

router.post('/register', registerController)
router.post('/verify-email', verifyEmailController)
router.post('/resend-verification', resendVerificationController)
router.post('/login', loginController)
router.post('/oauth', requireInternalSecret, oAuthController)
router.post('/refresh', refreshController)
router.post('/logout', logoutController)
router.get('/me', requireAuth, meController)

export default router
