import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'
import { useToast } from '@/components/ui/Toast'

export interface JoinClassroomModalProps {
  isOpen: boolean
  onClose: () => void
}

export const JoinClassroomModal = ({ isOpen, onClose }: JoinClassroomModalProps) => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [classCode, setClassCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!classCode.trim()) return

    setIsJoining(true)
    setTimeout(() => {
      setIsJoining(false)
      showToast({
        type: 'success',
        title: 'Joining Classroom...',
        message: `Connecting to room ${classCode.toUpperCase()} with MediaPipe AI active.`,
      })
      onClose()
      navigate(`/classroom/${classCode.toLowerCase()}`)
    }, 700)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Live AI Classroom"
      description="Enter the 6-character room code provided by your instructor"
    >
      <form onSubmit={handleJoin} className="space-y-4 mt-2">
        <Input
          label="Class Code"
          placeholder="e.g. QUANTUM-101"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value.toUpperCase())}
          leftIcon={<Icons.Video size={18} />}
          required
        />

        <div className="p-3 rounded-xl bg-background-tertiary border border-border/60 flex items-start gap-2.5 text-xs text-muted">
          <Icons.ShieldCheck className="text-success shrink-0 mt-0.5" size={16} />
          <span>
            Camera feed is analyzed client-side. Only attention metrics are transmitted to instructor.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="glow" size="sm" type="submit" isLoading={isJoining}>
            Enter Classroom
          </Button>
        </div>
      </form>
    </Modal>
  )
}
