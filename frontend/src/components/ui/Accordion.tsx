import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icons } from './Icons'

export interface AccordionItem {
  id: string
  title: string
  content: React.ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  defaultOpenId?: string
}

export const Accordion = ({ items, defaultOpenId }: AccordionProps) => {
  const [openId, setOpenId] = useState<string | undefined>(defaultOpenId)

  const toggle = (id: string) => {
    setOpenId(openId === id ? undefined : id)
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {items.map((item) => {
        const isOpen = openId === item.id
        return (
          <div
            key={item.id}
            className="rounded-xl bg-background-secondary border border-border/80 overflow-hidden transition-colors"
          >
            <button
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between p-4 text-left font-medium text-white hover:bg-background-tertiary/50 transition-colors"
            >
              <span>{item.title}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-muted"
              >
                <Icons.ChevronDown size={18} />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 text-sm text-gray-400 border-t border-border/40">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
