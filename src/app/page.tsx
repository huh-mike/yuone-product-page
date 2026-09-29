import { CustomCursor } from "@/components/custom-cursor";
import { Experience } from "@/components/experience/experience";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <CustomCursor />
      <SiteHeader />
      <main className="flex-1">
        <Experience />
      </main>
    </>
  );
}
