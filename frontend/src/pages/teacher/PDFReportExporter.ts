import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ClassReportData, StudentPersonalReportData } from '@/services/communicationApi'

export interface SessionReportData {
  className: string
  classCode: string
  instructor: string
  date: string
  totalStudents: number
  avgAttention: number
  avgConfusion: number
  students: Array<{
    name: string
    email: string
    attention: number
    confusion: number
    status: string
  }>
}

/**
 * 1. TEACHER CLASSROOM PDF REPORT
 * Comprehensive, authentic academic audit report containing classroom performance,
 * session timeline, authorized student roster, and metric definitions.
 */
export function generateTeacherClassroomPDFReport(data: ClassReportData) {
  const doc = new jsPDF()

  // Header Banner
  doc.setFillColor(15, 23, 42) // Slate 900
  doc.rect(0, 0, 210, 36, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('MindMap - Classroom Engagement & Focus Audit Report', 14, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184) // Slate 400
  doc.text(`Generated: ${new Date(data.generated_at).toLocaleString()} | Academic Analytics Layer`, 14, 28)

  // Classroom Info Block
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Classroom Overview', 14, 48)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Classroom Name: ${data.class_name}`, 14, 56)
  doc.text(`Classroom Code: ${data.class_code}`, 14, 62)
  doc.text(`Lead Instructor: ${data.instructor_name}`, 14, 68)
  doc.text(`Report Period:   ${data.date_range}`, 14, 74)

  // KPI Summary Card
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(120, 44, 76, 36, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(120, 44, 76, 36, 2, 2, 'S')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Key Engagement Indicators', 124, 52)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.text(`Enrolled Students: ${data.total_students_enrolled}`, 124, 60)
  doc.text(`Conducted Sessions: ${data.total_sessions_conducted}`, 124, 66)
  doc.text(`Avg Class Attention: ${data.overall_avg_attention > 0 ? `${data.overall_avg_attention}%` : 'No Data'}`, 124, 72)
  doc.text(`Avg Confusion Rate:  ${data.overall_avg_confusion > 0 ? `${data.overall_avg_confusion}%` : 'No Data'}`, 124, 78)

  let currentY = 88

  // Section: Session Timeline
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Session Performance Timeline', 14, currentY)
  currentY += 4

  if (data.sessions.length > 0) {
    const sessionRows = data.sessions.map((s, idx) => [
      `Session ${data.sessions.length - idx}`,
      new Date(s.started_at).toLocaleString(),
      s.ended_at ? new Date(s.ended_at).toLocaleTimeString() : 'In Progress',
      s.peak_students.toString(),
      s.avg_attention > 0 ? `${Math.round(s.avg_attention)}%` : 'No Data',
      s.avg_confusion > 0 ? `${Math.round(s.avg_confusion)}%` : 'No Data',
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Session', 'Start Time', 'End Time', 'Peak Students', 'Avg Attention', 'Avg Confusion']],
      body: sessionRows,
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })

    currentY = (doc as any).lastAutoTable.finalY + 10
  } else {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    doc.text('No recorded classroom sessions available in this period.', 14, currentY + 6)
    currentY += 16
  }

  // Section: Student Roster Analytics
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Student Attendance & Telemetry Summary', 14, currentY)
  currentY += 4

  if (data.student_roster.length > 0) {
    const rosterRows = data.student_roster.map((s) => [
      s.student_name,
      s.student_email,
      s.attendance_status,
      s.sessions_attended.toString(),
      s.avg_attention > 0 ? `${Math.round(s.avg_attention)}%` : 'Insufficient Data',
      s.avg_confusion > 0 ? `${Math.round(s.avg_confusion)}%` : 'Insufficient Data',
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Student Name', 'Email Address', 'Status', 'Attended', 'Attention', 'Confusion']],
      body: rosterRows,
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })

    currentY = (doc as any).lastAutoTable.finalY + 10
  } else {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    doc.text('No enrolled student telemetry available for this classroom.', 14, currentY + 6)
    currentY += 16
  }

  // Section: Metric Definitions & Academic Limitations
  if (currentY > 240) {
    doc.addPage()
    currentY = 20
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Scientific Methodology & Telemetry Formulations', 14, currentY)
  currentY += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  const definitions = [
    '• Eye Aspect Ratio (EAR): Bilateral ocular opening index (Soukupova & Cech). Indicates blink dynamics and drowsiness.',
    '• Gaze Deviation: Euclidean offset of iris coordinates normalized by eye canthi boundaries [0.0 - 1.0].',
    '• Head Pose Stability: 3D rotational trigonometry measuring yaw, pitch, and roll angular displacement.',
    '• Eyebrow Contraction: Inter-eyebrow distance scaled against inter-ocular distance to detect brow furrowing.',
    '• Attention & Confusion Models: Supervised Random Forest classification trained on temporal multi-sample windows.',
  ]
  definitions.forEach((line) => {
    doc.text(line, 14, currentY)
    currentY += 4.5
  })

  currentY += 2
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 116, 139)
  doc.text(data.data_limitations_notice, 14, currentY, { maxWidth: 182 })

  // Page Numbers & Confidential Watermark
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(
      `MindMap Academic Report • Confidential • Page ${i} of ${pageCount}`,
      14,
      288
    )
  }

  doc.save(`MindMap_Teacher_Report_${data.class_code}_${Date.now()}.pdf`)
}

/**
 * 2. STUDENT PERSONAL PDF REPORT
 * Protects student privacy: generates an authentic report containing ONLY the student's
 * authorized records, session history, and educational metric explanations.
 */
export function generateStudentPersonalPDFReport(data: StudentPersonalReportData) {
  const doc = new jsPDF()

  // Header Banner
  doc.setFillColor(30, 58, 138) // Blue 900
  doc.rect(0, 0, 210, 36, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('MindMap - Student Focus & Learning Feedback Report', 14, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(191, 219, 254) // Blue 200
  doc.text(`Generated: ${new Date(data.generated_at).toLocaleString()} | Student Personal Portal`, 14, 28)

  // Student Info Block
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Student & Course Profile', 14, 48)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Student Name:    ${data.student_name}`, 14, 56)
  doc.text(`Student Email:   ${data.student_email}`, 14, 62)
  doc.text(`Course / Class:  ${data.class_name} (${data.class_code})`, 14, 68)
  doc.text(`Report Period:   ${data.date_range}`, 14, 74)

  // KPI Summary Card
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(120, 44, 76, 36, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(120, 44, 76, 36, 2, 2, 'S')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Your Focus Summary', 124, 52)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.text(`Sessions Attended:   ${data.sessions_attended}`, 124, 60)
  doc.text(`Avg Attention Score: ${data.personal_avg_attention > 0 ? `${data.personal_avg_attention}%` : 'No Data'}`, 124, 67)
  doc.text(`Avg Confusion Rate:  ${data.personal_avg_confusion > 0 ? `${data.personal_avg_confusion}%` : 'No Data'}`, 124, 74)

  let currentY = 88

  // Section: Session History
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Your Recorded Attendance & Telemetry', 14, currentY)
  currentY += 4

  if (data.sessions.length > 0) {
    const sessionRows = data.sessions.map((s, idx) => [
      `Session ${data.sessions.length - idx}`,
      new Date(s.started_at).toLocaleString(),
      s.ended_at ? new Date(s.ended_at).toLocaleTimeString() : 'Active',
      s.avg_attention > 0 ? `${Math.round(s.avg_attention)}%` : 'No Data',
      s.avg_confusion > 0 ? `${Math.round(s.avg_confusion)}%` : 'No Data',
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Session', 'Start Time', 'End Time', 'Attention Score', 'Confusion Level']],
      body: sessionRows,
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })

    currentY = (doc as any).lastAutoTable.finalY + 12
  } else {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    doc.text('No session participation records found for this classroom in this period.', 14, currentY + 6)
    currentY += 18
  }

  // Section: Educational Feedback & Metric Explanations
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('How Your Engagement Metrics Are Estimated', 14, currentY)
  currentY += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  const explanations = [
    `• Attention Score: ${data.metric_explanations.attention_score || 'Evaluates screen gaze consistency, posture, and blink rhythm.'}`,
    `• Confusion Rate:  ${data.metric_explanations.confusion_score || 'Identifies periods of brow furrowing and rapid gaze deflection.'}`,
    `• Privacy Protection: ${data.metric_explanations.privacy || '100% Client-Side. No webcam images or video streams are stored.'}`,
  ]
  explanations.forEach((line) => {
    doc.text(line, 14, currentY, { maxWidth: 182 })
    currentY += 6
  })

  currentY += 4
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 116, 139)
  doc.text(data.data_limitations_notice, 14, currentY, { maxWidth: 182 })

  // Page Numbers & Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(
      `MindMap Student Report • Confidential • Page ${i} of ${pageCount}`,
      14,
      288
    )
  }

  doc.save(`MindMap_Student_Report_${data.class_code}_${Date.now()}.pdf`)
}

/**
 * 3. BACKWARD-COMPATIBLE FALLBACK EXPORTER
 */
export function generateSessionPDFReport(data: SessionReportData) {
  generateTeacherClassroomPDFReport({
    class_id: data.classCode,
    class_code: data.classCode,
    class_name: data.className,
    instructor_name: data.instructor,
    date_range: data.date,
    generated_at: new Date().toISOString(),
    has_data: data.students.length > 0,
    total_students_enrolled: data.totalStudents,
    total_sessions_conducted: 1,
    overall_avg_attention: data.avgAttention,
    overall_avg_confusion: data.avgConfusion,
    sessions: [
      {
        session_id: 'live_session',
        started_at: new Date().toISOString(),
        avg_attention: data.avgAttention,
        avg_confusion: data.avgConfusion,
        peak_students: data.totalStudents,
      },
    ],
    student_roster: data.students.map((s) => ({
      student_id: s.email,
      student_name: s.name,
      student_email: s.email,
      attendance_status: s.status,
      sessions_attended: 1,
      avg_attention: s.attention,
      avg_confusion: s.confusion,
    })),
    data_limitations_notice:
      'Notice: Metrics are estimated from real-time client-side facial landmark telemetry (EAR, Gaze, Brow, Head Pose). Zero raw video frames stored.',
  })
}
