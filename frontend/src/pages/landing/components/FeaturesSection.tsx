import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Icons.Brain className="text-blue-600" size={20} />,
      title: 'Real-Time Attention Tracking',
      description:
        'Continuous gaze direction and eye openness calculation estimating student focus levels live.',
      badge: 'Browser ML',
    },
    {
      icon: <Icons.Sparkles className="text-purple-600" size={20} />,
      title: 'Comprehension & Confusion Alerts',
      description:
        'Detect brow furrowing and head tilt deviations indicating student confusion during complex topics.',
      badge: 'Facial Mesh',
    },
    {
      icon: <Icons.ShieldCheck className="text-emerald-600" size={20} />,
      title: '100% Client-Side Privacy',
      description:
        'Video streams stay in local browser memory. Only numerical metrics are processed.',
      badge: 'Privacy Guaranteed',
    },
    {
      icon: <Icons.BarChart className="text-blue-600" size={20} />,
      title: 'Live Teacher Dashboards',
      description:
        'Instant classroom attention summaries, confusion alert queues, and individual student inspector tools.',
      badge: 'Analytics',
    },
    {
      icon: <Icons.Download className="text-amber-600" size={20} />,
      title: 'Automated Session Reports',
      description:
        'Export detailed classroom performance summaries, attendance rosters, and topic trends to PDF.',
      badge: 'PDF Export',
    },
    {
      icon: <Icons.Users className="text-slate-700" size={20} />,
      title: 'Classroom Session Roster',
      description:
        'Support raised hands, live chat, interactive prompts, and teacher screen sharing seamlessly.',
      badge: 'Live Roster',
    },
  ]

  return (
    <section id="features" className="py-16 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="info" size="sm" className="mb-2">
            Core Capabilities
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Designed for Modern Classrooms
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Empower educators with instant visual feedback and attention telemetry without compromising student privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((item, idx) => (
            <Card key={idx} variant="default" className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                  {item.icon}
                </div>
                <Badge variant="default" size="sm">
                  {item.badge}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
