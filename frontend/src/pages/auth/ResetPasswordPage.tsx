import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'
import { useToast } from '@/components/ui/Toast'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      showToast({ type: 'danger', title: 'Error', message: 'Passwords do not match.' })
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      showToast({
        type: 'success',
        title: 'Password Updated!',
        message: 'Please sign in with your new password.',
      })
      navigate('/login')
    }, 600)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-xs text-muted mt-1">Create a secure new password for your account</p>
        </div>

        <Card variant="glass" glow className="p-6 border-border/80">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Icons.Lock size={18} />}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Icons.Lock size={18} />}
              required
            />

            <Button type="submit" variant="glow" size="lg" className="w-full" isLoading={isLoading}>
              Update Password
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            <Link to="/login" className="text-accent font-semibold hover:underline">
              Back to Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
