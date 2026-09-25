import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export const HowItWorks = () => {
  const steps = [
    {
      num: '01',
      title: 'Teacher Creates Classroom',
      desc: 'Set up an online session in seconds and share a room join code.',
      icon: <Icons.Plus size={18} className="text-blue-600" />,
    },
    {
      num: '02',
      title: 'Students Join Session',
      desc: 'Students enter the room code in any browser without software downloads.',
      icon: <Icons.Video size={18} className="text-slate-700" />,
    },
    {
      num: '03',
      title: 'Local Feature Extraction',
      desc: 'MediaPipe Face Mesh calculates facial metrics in-browser at 30 FPS.',
      icon: <Icons.Brain size={18} className="text-emerald-600" />,
    },
    {
      num: '04',
      title: 'Teacher Reviews Telemetry',
      desc: 'Live attention dashboard highlights focus levels and exports PDF reports.',
      icon: <Icons.BarChart size={18} className="text-blue-600" />,
    },
  ]

  return (
    <section id="how-it-works" className="py-16 bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="default" size="sm" className="mb-2">
            Simple 4-Step Process
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            How MindMap Works
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Straightforward classroom workflow for teachers and students.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, idx) => (
            <Card key={idx} variant="default" className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-slate-400 font-mono">{s.num}</span>
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                  {s.icon}
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{s.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
