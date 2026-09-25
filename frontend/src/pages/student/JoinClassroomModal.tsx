import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'
import { useToast } from '@/components/ui/Toast'
import { classApi, EnrollmentItem } from '@/services/classApi'

export interface JoinClassroomModalProps {
  isOpen: boolean
  onClose: () => void
  onClassJoined?: (enrollment: EnrollmentItem) => void
}

export const JoinClassroomModal = ({ isOpen, onClose, onClassJoined }: JoinClassroomModalProps) => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [classCode, setClassCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = classCode.trim().toUpperCase()
    if (!cleanCode) return

    setIsJoining(true)
    try {
      const enrollment = await classApi.joinClass(cleanCode)
      showToast({
        type: 'success',
        title: 'Joined Successfully!',
        message: `Enrolled in ${enrollment.class_name} (${cleanCode}).`,
      })

      setClassCode('')
      setIsJoining(false)
      onClose()

      if (onClassJoined) {
        onClassJoined(enrollment)
      } else {
        navigate(`/classroom/${cleanCode.toLowerCase()}`)
      }
    } catch (err: any) {
      setIsJoining(false)
      showToast({
        type: 'danger',
        title: 'Join Failed',
        message: err?.message || 'Could not join classroom. Please verify the room code.',
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Classroom"
      description="Enter the unique Room Code provided by your instructor (e.g. PHY-4821)"
    >
      <form onSubmit={handleJoin} className="space-y-4 mt-2">
        <Input
          label="Classroom Code"
          placeholder="e.g. PHY-4821"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value.toUpperCase())}
          leftIcon={<Icons.Video size={18} />}
          required
        />

        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-700">
          <Icons.ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={16} />
          <span>
            Camera feed is analyzed 100% client-side via MediaPipe. Only derived attention and confusion telemetry will be shared with the teacher.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isJoining}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isJoining}>
            Join Classroom
          </Button>
        </div>
      </form>
    </Modal>
  )
}
