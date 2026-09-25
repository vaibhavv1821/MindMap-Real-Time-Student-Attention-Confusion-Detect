import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export interface LectureSegment {
  timestamp: string
  minute: number
  attention: number
  confusion: number
  topic: string
}

const timelineData: LectureSegment[] = [
  { timestamp: '00:00', minute: 0, attention: 95, confusion: 5, topic: 'Lecture Opening & Setup' },
  { timestamp: '08:00', minute: 8, attention: 94, confusion: 6, topic: 'Historical Background' },
  { timestamp: '15:00', minute: 15, attention: 90, confusion: 10, topic: 'Wave-Particle Duality' },
  { timestamp: '24:00', minute: 24, attention: 86, confusion: 14, topic: 'De Broglie Wavelength' },
  { timestamp: '32:00', minute: 32, attention: 64, confusion: 42, topic: 'Schrödinger Proof Start' }, // Spike start
  { timestamp: '40:00', minute: 40, attention: 58, confusion: 56, topic: 'Complex Differential Proof' }, // Max confusion
  { timestamp: '48:00', minute: 48, attention: 78, confusion: 24, topic: 'Instructor Clarification' },
  { timestamp: '56:00', minute: 56, attention: 89, confusion: 11, topic: 'Worked Math Example #1' },
  { timestamp: '68:00', minute: 68, attention: 92, confusion: 8, topic: 'Worked Math Example #2' },
  { timestamp: '80:00', minute: 80, attention: 90, confusion: 9, topic: 'Student Q&A Session' },
  { timestamp: '90:00', minute: 90, attention: 93, confusion: 6, topic: 'Session Conclusion' },
]

export const LectureTimeline = () => {
  return (
    <Card variant="glass" className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" size="sm">
              LECTURE DIAGNOSTIC TIMELINE
            </Badge>
            <Badge variant="danger" size="sm" dot>
              1 CONFUSION SPIKE (Min 32-48)
            </Badge>
          </div>
          <h3 className="text-xl font-bold text-white">90-Minute Engagement Timeline</h3>
          <p className="text-xs text-muted mt-0.5">
            Real-time aggregate attention levels and confusion indicators across lecture segments
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-success inline-block" />
            <span className="text-muted">Attention %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
            <span className="text-muted">Confusion %</span>
          </div>
        </div>
      </div>

      {/* Main Timeline Area Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="attGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3ECF8E" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3ECF8E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
            <XAxis dataKey="timestamp" stroke="#8A8A8E" fontSize={11} />
            <YAxis stroke="#8A8A8E" fontSize={11} domain={[0, 100]} />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as LectureSegment
                  return (
                    <div className="p-3 rounded-xl bg-background-secondary border border-border/80 shadow-2xl text-xs space-y-1">
                      <div className="font-bold text-accent font-mono">{data.timestamp} • {data.topic}</div>
                      <div className="text-success font-semibold">Attention: {data.attention}%</div>
                      <div className="text-purple-400 font-semibold">Confusion: {data.confusion}%</div>
                    </div>
                  )
                }
                return null
              }}
            />

            {/* Highlight Confusion Drop Region (Min 32 to 48) */}
            <ReferenceArea x1="32:00" x2="48:00" fill="#F5484D" fillOpacity={0.12} />
            <ReferenceLine x="40:00" stroke="#F5484D" strokeDasharray="3 3" label={{ value: 'Max Confusion Spike (56%)', fill: '#F5484D', fontSize: 10, position: 'top' }} />

            <Area
              type="monotone"
              dataKey="attention"
              stroke="#3ECF8E"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#attGradient)"
              name="Attention %"
            />
            <Area
              type="monotone"
              dataKey="confusion"
              stroke="#A855F7"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#confGradient)"
              name="Confusion %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Segment Takeaways & Interpretations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-background-secondary border border-border/60">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-success">
            <Icons.CheckCircle size={16} />
            <span>High-Attention Segment</span>
          </div>
          <div className="text-sm font-semibold text-white">00:00 - 24:00 (Intro & Duality)</div>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Classroom attention averaged <strong className="text-white">92%</strong>. Concept reception was optimal.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-background-secondary border border-danger/40">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-danger">
            <Icons.AlertTriangle size={16} />
            <span>Significant Attention Drop</span>
          </div>
          <div className="text-sm font-semibold text-white">32:00 - 48:00 (Schrödinger Proof)</div>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Attention dropped by <strong className="text-danger">28%</strong> during mathematical differential proof steps.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-background-secondary border border-border/60">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-accent">
            <Icons.Sparkles size={16} />
            <span>Educational Takeaway</span>
          </div>
          <div className="text-sm font-semibold text-white">Recommendation</div>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Break down mathematical proofs into smaller visual steps before proceeding to worked examples.
          </p>
        </div>
      </div>
    </Card>
  )
}
