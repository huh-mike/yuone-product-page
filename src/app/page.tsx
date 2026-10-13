import { CustomCursor } from "@/components/custom-cursor";
import { Experience } from "@/components/experience/experience";

export default function Home() {
  return (
    <>
      <CustomCursor />
      <main className="flex-1">
        <Experience />
      </main>
    </>
  );
}
