import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/authMiddleware'
import { analyticsService } from '../services/analyticsService'

export const getClassroomAnalyticsHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const analytics = await analyticsService.getClassroomAnalytics(id)
  return res.status(200).json({ success: true, data: analytics })
}

export const getStudentAttentionHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const studentTelemetry = await analyticsService.getStudentAttentionTelemetry(id)
  return res.status(200).json({ success: true, data: studentTelemetry })
}
