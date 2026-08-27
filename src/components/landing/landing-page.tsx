import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { TrustedBy } from "@/components/landing/trusted-by";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { StatBand } from "@/components/landing/stat-band";
import { Testimonials } from "@/components/landing/testimonials";
import { CvExamples } from "@/components/landing/cv-examples";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <LandingNav />
      <Hero />
      <TrustedBy />
      <HowItWorks />
      <FeatureGrid />
      <StatBand />
      <Testimonials />
      <CvExamples />
      <FaqAccordion />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
