import { Router } from 'express'
import prisma from '../config/db.js';

const router = Router()

router.get('/health', async (req, res) => {
    const count = await prisma.user.count()
    res.json({ status: 'ok', users: count })

});

export default router