import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'
import { useToast } from '@/components/ui/Toast'

export interface CreateClassroomModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CreateClassroomModal = ({ isOpen, onClose }: CreateClassroomModalProps) => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [className, setClassName] = useState('')
  const [subject, setSubject] = useState('')
  const [code, setCode] = useState(() => 'MM-' + Math.floor(100 + Math.random() * 900))
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!className.trim()) return

    setIsCreating(true)
    setTimeout(() => {
      setIsCreating(false)
      showToast({
        type: 'success',
        title: 'Classroom Created!',
        message: `Class Code: ${code}. Redirecting to live room...`,
      })
      onClose()
      navigate(`/classroom/${code.toLowerCase()}`)
    }, 700)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New AI Classroom"
      description="Set up live session details and generate a shareable class code"
    >
      <form onSubmit={handleCreate} className="space-y-4 mt-2">
        <Input
          label="Classroom Name"
          placeholder="e.g. Quantum Physics 101"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          leftIcon={<Icons.Brain size={18} />}
          required
        />

        <Input
          label="Subject / Topic"
          placeholder="e.g. Wave Mechanics"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          leftIcon={<Icons.Layers size={18} />}
          required
        />

        <div className="flex gap-2 items-end">
          <Input
            label="Class Code (Shareable)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            leftIcon={<Icons.Lock size={18} />}
            required
          />
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setCode('MM-' + Math.floor(100 + Math.random() * 900))}
          >
            Regenerate
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="glow" size="sm" type="submit" isLoading={isCreating}>
            Launch Classroom
          </Button>
        </div>
      </form>
    </Modal>
  )
}
