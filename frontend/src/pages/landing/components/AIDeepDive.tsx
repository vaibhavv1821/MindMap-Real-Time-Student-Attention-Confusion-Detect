import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export const AIDeepDive = () => {
  return (
    <section id="ai-tech" className="py-16 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="success" size="sm" className="mb-3" dot>
              Privacy & Computer Vision Architecture
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Client-Side 468 Landmark Feature Extraction
            </h2>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              MindMap processes MediaPipe Face Mesh coordinates directly inside the browser using WebAssembly. Physical features (Eye Aspect Ratio, Head Orientation, Brow Distance) are calculated locally in browser memory.
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <Icons.ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Guaranteed Student Privacy</h4>
                  <p className="text-xs text-slate-600">
                    No camera streams or pictures leave the student device. Only numerical telemetry metrics are processed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Icons.Cpu size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Low-Resource Processing</h4>
                  <p className="text-xs text-slate-600">
                    Optimized WebAssembly execution runs smoothly on standard laptops and educational devices.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card variant="default" className="p-5 border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                <span className="font-semibold text-slate-900 font-mono">FACIAL LANDMARK PIPELINE</span>
              </div>
              <Badge variant="default" size="sm">30 FPS</Badge>
            </div>

            <div className="h-52 rounded-lg bg-slate-900 border border-slate-800 p-4 text-white flex flex-col items-center justify-center font-mono text-center">
              <Icons.Brain className="text-blue-400 mb-2" size={32} />
              <div className="text-sm font-bold text-slate-200">MediaPipe Face Mesh</div>
              <div className="text-xs text-slate-400 mt-1">468 3D Coordinates • In-Browser WASM</div>
              <div className="mt-3 flex items-center gap-4 text-xs text-emerald-400">
                <span>Yaw: -2°</span>
                <span>Pitch: +1°</span>
                <span>EAR: 0.28</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-left text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Eye Aspect Ratio</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">0.28 (Resting)</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Eyebrow Distance</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">Normal (0.22)</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
