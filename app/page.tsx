import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]")}>
      <main className="flex flex-col gap-[32px] items-center sm:items-start">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to <span className="text-primary">ChatWebx</span>
          </h1>
          <p className="mt-6 text-lg max-w-2xl leading-8">
            ChatWebx is a new generation chating platform to stay connected
            with the world.
          </p>
        </div>

        <Link href="/auth/sign-up">
          <Button className="font-medium">
            Get Started
          </Button>
        </Link>

      </main>
    </div>
  );
}
