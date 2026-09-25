export interface ClassroomModel {
  id: string
  code: string
  title: string
  subject: string
  teacherId: string
  teacherName: string
  createdAt: string
  activeStudents: number
  avgAttention: number
  avgConfusion: number
  isLive: boolean
}

export interface StudentRosterItem {
  id: string
  name: string
  email: string
  role: 'student'
  joinedAt: string
  attentionScore: number
  confusionScore: number
  status: 'FOCUSED' | 'MODERATE' | 'LOW_FOCUS' | 'CONFUSED'
  connectionStatus: 'ONLINE' | 'CAMERA_MUTED' | 'OFFLINE'
  isHandRaised: boolean
}

export class ClassroomService {
  private classrooms: Map<string, ClassroomModel> = new Map()
  private rosters: Map<string, StudentRosterItem[]> = new Map()

  constructor() {
    this.seedMockData()
  }

  private seedMockData() {
    const demoRoom: ClassroomModel = {
      id: 'room_quantum_101',
      code: 'QUANTUM-101',
      title: 'Quantum Physics 101',
      subject: 'Physics',
      teacherId: 'usr_teacher_01',
      teacherName: 'Prof. Robert Vance',
      createdAt: new Date().toISOString(),
      activeStudents: 15,
      avgAttention: 84,
      avgConfusion: 14,
      isLive: true,
    }

    this.classrooms.set(demoRoom.id, demoRoom)
    this.classrooms.set(demoRoom.code.toLowerCase(), demoRoom)

    const mockRoster: StudentRosterItem[] = [
      { id: 'std_01', name: 'Alex Johnson', email: 'alex@univ.edu', role: 'student', joinedAt: '10:00 AM', attentionScore: 92, confusionScore: 10, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false },
      { id: 'std_02', name: 'Sarah Miller', email: 'sarah@univ.edu', role: 'student', joinedAt: '10:01 AM', attentionScore: 88, confusionScore: 14, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false },
      { id: 'std_03', name: 'David Clark', email: 'david@univ.edu', role: 'student', joinedAt: '10:02 AM', attentionScore: 38, confusionScore: 68, status: 'CONFUSED', connectionStatus: 'ONLINE', isHandRaised: true },
      { id: 'std_04', name: 'Emma Watson', email: 'emma@univ.edu', role: 'student', joinedAt: '10:00 AM', attentionScore: 96, confusionScore: 5, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false },
      { id: 'std_05', name: 'Liam Brown', email: 'liam@univ.edu', role: 'student', joinedAt: '10:05 AM', attentionScore: 78, confusionScore: 22, status: 'MODERATE', connectionStatus: 'ONLINE', isHandRaised: false },
    ]

    this.rosters.set(demoRoom.id, mockRoster)
  }

  public async createClassroom(data: { title: string; subject: string; teacherId: string; teacherName: string }): Promise<ClassroomModel> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const id = `room_${code.toLowerCase()}`

    const newRoom: ClassroomModel = {
      id,
      code,
      title: data.title,
      subject: data.subject,
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      createdAt: new Date().toISOString(),
      activeStudents: 0,
      avgAttention: 100,
      avgConfusion: 0,
      isLive: true,
    }

    this.classrooms.set(id, newRoom)
    this.classrooms.set(code.toLowerCase(), newRoom)
    this.rosters.set(id, [])

    return newRoom
  }

  public async getClassroomByIdOrCode(idOrCode: string): Promise<ClassroomModel | null> {
    return this.classrooms.get(idOrCode.toLowerCase()) || null
  }

  public async joinClassroom(code: string, student: { id: string; name: string; email: string }): Promise<StudentRosterItem> {
    const room = await this.getClassroomByIdOrCode(code)
    if (!room) {
      throw new Error('Classroom code not found')
    }

    const currentRoster = this.rosters.get(room.id) || []
    const existing = currentRoster.find((s) => s.id === student.id)
    if (existing) {
      existing.connectionStatus = 'ONLINE'
      return existing
    }

    const newItem: StudentRosterItem = {
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student',
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attentionScore: 90,
      confusionScore: 10,
      status: 'FOCUSED',
      connectionStatus: 'ONLINE',
      isHandRaised: false,
    }

    currentRoster.push(newItem)
    this.rosters.set(room.id, currentRoster)
    room.activeStudents = currentRoster.length

    return newItem
  }

  public async getStudentsInClassroom(roomId: string): Promise<StudentRosterItem[]> {
    return this.rosters.get(roomId) || []
  }
}

export const classroomService = new ClassroomService()
