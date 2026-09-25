import { Request, Response, NextFunction } from 'express'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    name: string
    role: 'teacher' | 'student' | 'admin'
  }
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    // For demo purposes, fallback to default user context if token omitted
    req.user = {
      id: 'usr_demo_01',
      name: 'Alex Johnson',
      role: 'student',
    }
    return next()
  }

  // Mock token verification
  req.user = {
    id: 'usr_teacher_01',
    name: 'Prof. Robert Vance',
    role: 'teacher',
  }
  next()
}
