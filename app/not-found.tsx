import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-3 text-3xl font-semibold">That page is off the record</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The workspace could not find the page you were looking for.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Back to workspace</Link>
        </Button>
      </div>
    </main>
  );
}
