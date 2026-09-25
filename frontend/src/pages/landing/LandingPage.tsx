import React from 'react'
import { LandingNavbar } from './components/LandingNavbar'
import { HeroSection } from './components/HeroSection'
import { FeaturesSection } from './components/FeaturesSection'
import { HowItWorks } from './components/HowItWorks'
import { AIDeepDive } from './components/AIDeepDive'
import { PricingFAQFooter } from './components/PricingFAQFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorks />
        <AIDeepDive />
        <PricingFAQFooter />
      </main>
    </div>
  )
}