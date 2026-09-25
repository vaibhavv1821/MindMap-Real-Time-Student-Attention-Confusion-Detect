import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

export function generateSessionPDFReport(data: SessionReportData) {
  const doc = new jsPDF()

  // Header Banner
  doc.setFillColor(10, 10, 11) // Dark background
  doc.rect(0, 0, 210, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('MindMap - Session Performance Summary', 14, 22)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(138, 138, 142)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)

  // Meta Info Box
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Class Information', 14, 52)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Classroom Name: ${data.className}`, 14, 60)
  doc.text(`Class Code: ${data.classCode}`, 14, 66)
  doc.text(`Instructor: ${data.instructor}`, 14, 72)
  doc.text(`Date & Time: ${data.date}`, 14, 78)

  // Metrics summary
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(120, 48, 76, 36, 3, 3, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Key Performance Indicators', 124, 56)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Active Students: ${data.totalStudents}`, 124, 64)
  doc.text(`Avg Class Attention: ${data.avgAttention}%`, 124, 70)
  doc.text(`Avg Confusion Rate: ${data.avgConfusion}%`, 124, 76)

  // Roster Table
  const tableRows = data.students.map((s) => [
    s.name,
    s.email,
    `${s.attention}%`,
    `${s.confusion}%`,
    s.status,
  ])

  autoTable(doc, {
    startY: 90,
    head: [['Student Name', 'Email Address', 'Attention Score', 'Confusion Level', 'Attendance']],
    body: tableRows,
    headStyles: { fillColor: [79, 140, 255], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  })

  // Footer Note
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Confidential MindMap AI Analytics Report • 100% Client-Side Privacy Preserved',
      14,
      288
    )
  }

  doc.save(`MindMap_Report_${data.classCode}_${Date.now()}.pdf`)
}
