import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md">
        <div className="mb-4 inline-flex p-4 rounded-2xl bg-accent/10 text-accent border border-accent/20">
          <Icons.Brain size={48} />
        </div>
        <h1 className="text-7xl font-extrabold tracking-tight text-white font-mono">404</h1>
        <h2 className="text-xl font-bold text-white mt-2">Classroom Page Not Found</h2>
        <p className="text-xs text-muted mt-2 leading-relaxed">
          The requested room or page might have ended, been moved, or does not exist.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link to="/">
            <Button variant="glow" size="md" leftIcon={<Icons.ArrowRight size={18} />}>
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}