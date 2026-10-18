import { Router } from 'express'
import { loginController, meController, registerController } from '../controllers/auth.controller.js';
import requireAuth from '../middlewares/requireAuth.js';

const router = Router()

router.post('/register', registerController);
router.post('/login', loginController);
router.get('/me', requireAuth, meController)

export default router