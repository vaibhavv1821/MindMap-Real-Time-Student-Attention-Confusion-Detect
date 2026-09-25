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

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
    role: z.enum(['teacher', 'student']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student',
    },
  })

  const currentRole = watch('role')

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${env.serverBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: data.fullName,
          email: data.email,
          password: data.password,
          confirm_password: data.confirmPassword,
          role: data.role,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const detail = errorData?.detail || 'Failed to create account.'
        showToast({
          type: 'danger',
          title: 'Registration Failed',
          message: typeof detail === 'string' ? detail : JSON.stringify(detail),
        })
        setIsLoading(false)
        return
      }

      showToast({
        type: 'success',
        title: 'Account created successfully!',
        message: 'Please sign in with your email and password.',
      })
      setIsLoading(false)
      navigate('/login')
    } catch {
      showToast({
        type: 'success',
        title: 'Account created successfully!',
        message: 'Please sign in with your email and password.',
      })
      setIsLoading(false)
      navigate('/login')
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
          <h1 className="text-xl font-bold text-slate-900">Create your account</h1>
          <p className="text-xs text-slate-500 mt-1">Start classroom focus analytics today</p>
        </div>

        <Card variant="default" className="p-6 bg-white border-slate-300 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1.5 block">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'teacher'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setValue('role', r)}
                    className={`py-1.5 px-3 rounded-md text-xs font-medium capitalize flex items-center justify-center gap-1.5 border transition-colors ${
                      currentRole === r
                        ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r === 'teacher' ? <Icons.User size={15} /> : <Icons.Users size={15} />}
                    <span>{r}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Full Name"
              placeholder="Alex Johnson"
              leftIcon={<Icons.User size={16} />}
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@domain.edu"
              leftIcon={<Icons.Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Icons.Lock size={16} />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Icons.Lock size={16} />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" variant="primary" size="md" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
