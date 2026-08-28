import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/components/GameApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="h-dvh w-full overflow-hidden">
      <GameApp />
    </main>
  );
}
