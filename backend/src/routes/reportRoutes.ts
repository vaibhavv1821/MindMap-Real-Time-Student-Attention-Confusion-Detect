import { Router } from 'express'
import { getSessionReportHandler } from '../controllers/reportController'
import { authenticateToken } from '../middleware/authMiddleware'

const router = Router()

router.get('/sessions/:id/report', authenticateToken, getSessionReportHandler)

export default router
