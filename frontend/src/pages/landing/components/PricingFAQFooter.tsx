import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Accordion } from '@/components/ui/Accordion'
import { Icons } from '@/components/ui/Icons'

export const PricingFAQFooter = () => {
  const faqItems = [
    {
      id: '1',
      title: 'Is student camera video uploaded or recorded on servers?',
      content:
        'No, absolutely not. All computer vision and facial landmark calculations occur entirely in the student browser using WebAssembly. Only anonymized numerical metrics are transmitted.',
    },
    {
      id: '2',
      title: 'What happens if a student turns off their camera?',
      content:
        'The platform dashboard cleanly displays a "Camera Muted" badge for that student.',
    },
    {
      id: '3',
      title: 'Does MindMap require high-end hardware?',
      content:
        'No. MediaPipe FaceMesh is lightweight and optimized to run smoothly on standard laptops and Chromebooks.',
    },
    {
      id: '4',
      title: 'Can teachers export attendance and attention analytics?',
      content:
        'Yes. Teachers can generate formatted PDF session summary reports with a single click.',
    },
  ]

  return (
    <>
      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="default" size="sm" className="mb-2">
              Got Questions?
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>
          <Accordion items={faqItems} defaultOpenId="1" />
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-12 bg-white border-b border-slate-200 text-slate-900">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Ready to Start Classroom Monitoring?
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            Instant classroom focus analytics designed for higher education.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/register">
              <Button variant="primary" size="md">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-10 border-t border-slate-200 text-slate-600">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              <Icons.Brain size={16} />
            </div>
            <span className="text-base font-bold text-slate-900">MindMap</span>
          </div>

          <div className="flex gap-6">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              Workflow
            </a>
            <a href="#ai-tech" className="hover:text-slate-900 transition-colors">
              Privacy
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </div>

          <div>© {new Date().getFullYear()} MindMap. All rights reserved.</div>
        </div>
      </footer>
    </>
  )
}
