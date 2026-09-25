import { Router } from 'express'
import {
  createClassroomHandler,
  getClassroomHandler,
  joinClassroomHandler,
  getClassroomStudentsHandler,
} from '../controllers/classroomController'
import { authenticateToken } from '../middleware/authMiddleware'

const router = Router()

router.post('/', authenticateToken, createClassroomHandler)
router.get('/:id', authenticateToken, getClassroomHandler)
router.post('/:id/join', authenticateToken, joinClassroomHandler)
router.get('/:id/students', authenticateToken, getClassroomStudentsHandler)

export default router
