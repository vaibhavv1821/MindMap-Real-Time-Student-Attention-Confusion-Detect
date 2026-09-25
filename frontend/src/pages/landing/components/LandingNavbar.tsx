import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'

export const LandingNavbar = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
            <Icons.Brain size={18} />
          </div>
          <span className="text-base font-bold text-slate-900">MindMap</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
            Workflow
          </a>
          <a href="#ai-tech" className="hover:text-slate-900 transition-colors">
            Privacy & Architecture
          </a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
