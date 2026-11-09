import { Router } from 'express'
import requireAuth from '../middlewares/requireAuth.js'
import { convertIdeaToProjectController, createIdeaController, deleteIdeaController, getIdeaByIdController, getIdeasController, updateIdeaController } from '../controllers/idea.controller.js'


const router = Router()

router.get('/', getIdeasController)
router.get('/:id', getIdeaByIdController)
router.post('/', requireAuth, createIdeaController)
router.patch('/:id', requireAuth, updateIdeaController)
router.delete('/:id', requireAuth, deleteIdeaController)
router.post('/:id/project', requireAuth, convertIdeaToProjectController)

export default router