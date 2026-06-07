import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { AgentsSection } from "@/components/landing/agents-section";
import { Compare } from "@/components/landing/compare";
import { FinalCTA } from "@/components/landing/final-cta";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <LandingNav />
      <Hero />
      <Features />
      <AgentsSection />
      <Compare />
      <FinalCTA />
    </main>
  );
}
