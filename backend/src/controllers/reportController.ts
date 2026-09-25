import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/authMiddleware'
import { analyticsService } from '../services/analyticsService'

export const getSessionReportHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const report = await analyticsService.getSessionReport(id)
  return res.status(200).json({ success: true, data: report })
}
