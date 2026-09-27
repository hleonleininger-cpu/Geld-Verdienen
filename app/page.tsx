import { MarketingNavbar } from "@/components/marketing/Navbar";
import { MarketingFooter } from "@/components/marketing/Footer";
import { Hero } from "@/components/marketing/Hero";
import {
  Problem,
  HowItWorks,
  Features,
  PricingPreview,
  FAQ,
  FinalCTA,
} from "@/components/marketing/Sections";
import { track } from "@/lib/analytics";

export default async function HomePage() {
  await track("landing_view");

  return (
    <>
      <MarketingNavbar />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <PricingPreview />
        <FAQ />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </>
  );
}
