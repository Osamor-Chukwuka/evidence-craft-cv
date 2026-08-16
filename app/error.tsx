"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">This view did not load</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Something interrupted the workspace. Try again, or return to the dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary">
            <a href="/dashboard">Dashboard</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
