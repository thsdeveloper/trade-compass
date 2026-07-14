import {
  WaitlistHeader,
  WaitlistHero,
  WaitlistPillars,
  MobileAppSection,
  WaitlistFooter,
} from '@/components/organisms/landing';

// Fase de pré-lançamento: a home é uma página de captura de leads (lista de
// espera). A landing completa (features, pricing, FAQ...) permanece em
// components/organisms/landing para reativação no lançamento.
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <WaitlistHeader />
      <main>
        {/* Dark: Hero com formulário de waitlist */}
        <WaitlistHero />
        {/* Light: pilares do produto */}
        <WaitlistPillars />
        {/* Dark: app mobile iOS/Android + segundo formulário */}
        <MobileAppSection />
      </main>
      <WaitlistFooter />
    </div>
  );
}
