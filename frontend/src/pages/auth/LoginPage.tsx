import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthContext()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setAuthError(null)

    try {
      const response = await fetch(`${env.serverBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      })

      if (!response.ok) {
        setIsLoading(false)
        const errDetail = 'Invalid email or password'
        setAuthError(errDetail)
        showToast({
          type: 'danger',
          title: 'Sign In Failed',
          message: errDetail,
        })
        return
      }

      const tokenData = await response.json()
      if (!tokenData.access_token) {
        setIsLoading(false)
        setAuthError('Authentication failed: No access token received.')
        return
      }

      // Fetch authoritative user profile from MongoDB /auth/me
      const meRes = await fetch(`${env.serverBaseUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })

      if (!meRes.ok) {
        setIsLoading(false)
        setAuthError('Failed to load user profile. Please try again.')
        return
      }

      const userData = await meRes.json()
      login(
        {
          id: userData.id,
          name: userData.full_name,
          email: userData.email,
          role: userData.role,
        },
        tokenData.access_token
      )

      setIsLoading(false)
      showToast({
        type: 'success',
        title: 'Welcome back',
        message: `Signed in as ${userData.full_name} (${userData.role.toUpperCase()}).`,
      })

      // Route strictly based on authoritative MongoDB role
      if (userData.role === 'teacher') {
        navigate('/teacher/dashboard')
      } else if (userData.role === 'student') {
        navigate('/student/dashboard')
      } else {
        navigate('/admin/dashboard')
      }
    } catch (err: any) {
      setIsLoading(false)
      const errMsg = err?.message || 'Network error: could not connect to authentication server.'
      setAuthError(errMsg)
      showToast({
        type: 'danger',
        title: 'Connection Error',
        message: errMsg,
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 text-slate-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              <Icons.Brain size={18} />
            </div>
            <span className="text-xl font-bold text-slate-900">MindMap</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Sign in to your account</h1>
          <p className="text-xs text-slate-500 mt-1">Access classroom monitoring & telemetry</p>
        </div>

        <Card variant="default" className="p-6 bg-white border-slate-300 shadow-sm">
          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-2">
              <Icons.AlertTriangle size={15} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@domain.edu"
              leftIcon={<Icons.Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Icons.Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-slate-900"
                  >
                    {showPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="flex justify-end mt-1">
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" variant="primary" size="md" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
              Create account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
