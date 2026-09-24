import { CustomCursor } from "@/components/custom-cursor";
import { PlaceholderSections } from "@/components/placeholder-sections";
import { ScrollHero } from "@/components/scroll-hero/scroll-hero";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <CustomCursor />
      <SiteHeader />
      <main className="flex-1">
        <ScrollHero />
        <PlaceholderSections />
      </main>
    </>
  );
}
