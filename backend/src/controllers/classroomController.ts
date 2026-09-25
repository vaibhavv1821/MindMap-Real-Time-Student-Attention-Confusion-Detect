import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/authMiddleware'
import { classroomService } from '../services/classroomService'

export const createClassroomHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { title, subject } = req.body

  if (!title) {
    return res.status(400).json({ success: false, message: 'Classroom title is required' })
  }

  const room = await classroomService.createClassroom({
    title,
    subject: subject || 'General Science',
    teacherId: req.user?.id || 'usr_teacher_01',
    teacherName: req.user?.name || 'Prof. Robert Vance',
  })

  return res.status(201).json({ success: true, data: room })
}

export const getClassroomHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const room = await classroomService.getClassroomByIdOrCode(id)

  if (!room) {
    return res.status(404).json({ success: false, message: 'Classroom not found' })
  }

  return res.status(200).json({ success: true, data: room })
}

export const joinClassroomHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params // classroom code or id

  try {
    const studentItem = await classroomService.joinClassroom(id, {
      id: req.user?.id || 'usr_student_01',
      name: req.user?.name || 'Alex Johnson',
      email: 'alex@univ.edu',
    })

    return res.status(200).json({ success: true, data: studentItem })
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message })
  }
}

export const getClassroomStudentsHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const students = await classroomService.getStudentsInClassroom(id)
  return res.status(200).json({ success: true, data: students })
}
