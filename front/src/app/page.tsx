'use client';

import {
  LandingHeader,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  BenefitsSection,
  PricingSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  LandingFooter,
} from '@/components/organisms/landing';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        {/* Light: Hero */}
        <HeroSection />
        {/* Dark: Features */}
        <FeaturesSection />
        {/* Light: How It Works */}
        <HowItWorksSection />
        {/* Light: Benefits */}
        <BenefitsSection />
        {/* Dark: Testimonials */}
        <TestimonialsSection />
        {/* Dark: Pricing */}
        <PricingSection />
        {/* Light: FAQ */}
        <FAQSection />
        {/* Dark: CTA */}
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
