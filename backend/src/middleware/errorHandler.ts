import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  console.error(`[MindMap Backend Error] ${statusCode} - ${message}`)

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
    },
  })
}
