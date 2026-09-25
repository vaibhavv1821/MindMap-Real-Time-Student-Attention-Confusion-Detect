import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'
import { useToast } from '@/components/ui/Toast'
import { classApi, ClassItem } from '@/services/classApi'

export interface CreateClassroomModalProps {
  isOpen: boolean
  onClose: () => void
  onClassCreated?: (newClass: ClassItem) => void
}

export const CreateClassroomModal = ({ isOpen, onClose, onClassCreated }: CreateClassroomModalProps) => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [className, setClassName] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!className.trim() || !subject.trim()) return

    setIsCreating(true)
    try {
      const created = await classApi.createClass({
        name: className.trim(),
        subject: subject.trim(),
        description: description.trim(),
      })

      showToast({
        type: 'success',
        title: 'Classroom Created!',
        message: `Class Code: ${created.class_code}. Share this code with students.`,
      })

      setClassName('')
      setSubject('')
      setDescription('')
      setIsCreating(false)
      onClose()

      if (onClassCreated) {
        onClassCreated(created)
      } else {
        navigate(`/classroom/${created.class_code.toLowerCase()}`)
      }
    } catch (err: any) {
      setIsCreating(false)
      showToast({
        type: 'danger',
        title: 'Creation Failed',
        message: err?.message || 'Could not create classroom in MongoDB.',
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New AI Classroom"
      description="Create a real classroom in MongoDB and generate a unique room code for students."
    >
      <form onSubmit={handleCreate} className="space-y-4 mt-2">
        <Input
          label="Classroom Name"
          placeholder="e.g. Advanced Machine Learning & Vision"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          leftIcon={<Icons.Brain size={18} />}
          required
        />

        <Input
          label="Subject / Topic"
          placeholder="e.g. Computer Science"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          leftIcon={<Icons.Layers size={18} />}
          required
        />

        <Input
          label="Description (Optional)"
          placeholder="e.g. Weekly live focus & confusion telemetry lecture"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          leftIcon={<Icons.FileText size={18} />}
        />

        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-start gap-2">
          <Icons.Info size={16} className="shrink-0 mt-0.5" />
          <span>A unique shareable Room Code (e.g. CS-4921) will be generated automatically and stored in MongoDB Atlas.</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isCreating}>
            Create Classroom
          </Button>
        </div>
      </form>
    </Modal>
  )
}
