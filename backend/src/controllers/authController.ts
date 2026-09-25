import { Request, Response } from 'express'

export const loginHandler = async (req: Request, res: Response) => {
  const { email, password, role } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' })
  }

  // Demo Mock Auth Token & User Response
  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: role === 'teacher' ? 'usr_teacher_01' : 'usr_student_01',
        name: role === 'teacher' ? 'Prof. Robert Vance' : 'Alex Johnson',
        email,
        role: role || 'student',
      },
      token: 'mock_jwt_token_mindmap_2026',
    },
  })
}

export const registerHandler = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' })
  }

  return res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: `usr_${Date.now()}`,
        name,
        email,
        role: role || 'student',
      },
      token: 'mock_jwt_token_mindmap_2026',
    },
  })
}
