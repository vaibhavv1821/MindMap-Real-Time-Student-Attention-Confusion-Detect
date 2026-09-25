import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'
import { useToast } from '@/components/ui/Toast'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      showToast({
        type: 'success',
        title: 'Reset Link Sent',
        message: 'Check your email inbox for password recovery link.',
      })
      navigate('/reset-password')
    }, 600)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/20">
              <Icons.Brain size={22} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Mind<span className="text-accent">Map</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Forgot Password?</h1>
          <p className="text-xs text-muted mt-1">Enter your registered email to receive reset instructions</p>
        </div>

        <Card variant="glass" glow className="p-6 border-border/80">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Icons.Mail size={18} />}
              required
            />

            <Button type="submit" variant="glow" size="lg" className="w-full" isLoading={isLoading}>
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            Remember password?{' '}
            <Link to="/login" className="text-accent font-semibold hover:underline">
              Back to Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
