import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Icons } from '@/components/ui/Icons'

export const HeroSection = () => {
  const [liveScore, setLiveScore] = useState(92)
  const [liveConfusion, setLiveConfusion] = useState(14)

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScore(Math.floor(85 + Math.random() * 12))
      setLiveConfusion(Math.floor(10 + Math.random() * 15))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="bg-slate-50 pt-12 pb-16 md:pt-16 md:pb-24 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Tagline Badge */}
        <div className="inline-flex items-center gap-2 mb-4">
          <Badge variant="info" size="md" dot>
            Classroom Focus & Attention Analytics Platform
          </Badge>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
          Real-Time Student Attention & Confusion Detector
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Browser-based classroom focus tracking and instant comprehension analytics for higher education. Video frames stay 100% private in browser memory.
        </p>

        {/* Call-to-action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/register">
            <Button variant="primary" size="lg">
              Get Started
            </Button>
          </Link>
          <Link to="/classroom/demo">
            <Button variant="outline" size="lg" leftIcon={<Icons.Play size={16} />}>
              Launch Live Demo Session
            </Button>
          </Link>
        </div>

        {/* Privacy Note */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Icons.ShieldCheck className="text-emerald-600" size={15} />
          <span>100% Client-Side Privacy: Video streams never leave student browsers</span>
        </div>

        {/* Hero Demo Mockup Container */}
        <div className="mt-10 max-w-4xl mx-auto">
          <Card variant="default" className="p-4 bg-white border-slate-300 shadow-md text-left">
            {/* Dashboard Mockup Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-600 font-mono ml-2">
                  mindmap.edu/classroom/QUANTUM-101
                </span>
              </div>
              <Badge variant="success" size="sm" dot>
                LIVE SESSION
              </Badge>
            </div>

            {/* Mock Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 rounded-lg bg-slate-900 border border-slate-800 p-4 text-white flex flex-col justify-between h-56">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Prof. Robert Vance • Quantum Physics 101</span>
                  <span className="text-slate-400 font-mono">15 Enrolled</span>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Average Attention</div>
                    <div className="text-3xl font-bold text-emerald-400 font-mono">{liveScore}%</div>
                  </div>
                  <div className="text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded border border-slate-700 font-mono">
                    Confusion Spike: {liveConfusion}%
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-600">Student Focus Metric</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{liveScore}%</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-600">MediaPipe Face Mesh</div>
                  <div className="text-xs font-medium text-emerald-700 mt-1">30 FPS • Local WASM</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
