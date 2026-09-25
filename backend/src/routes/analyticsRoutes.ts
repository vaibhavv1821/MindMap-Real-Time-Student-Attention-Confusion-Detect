import { Router } from 'express'
import {
  getClassroomAnalyticsHandler,
  getStudentAttentionHandler,
} from '../controllers/analyticsController'
import { authenticateToken } from '../middleware/authMiddleware'

const router = Router()

router.get('/classrooms/:id/analytics', authenticateToken, getClassroomAnalyticsHandler)
router.get('/students/:id/attention', authenticateToken, getStudentAttentionHandler)

export default router
