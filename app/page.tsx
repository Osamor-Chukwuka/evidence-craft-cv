import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  GitPullRequest,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const proofSignals = [
  "Commits and merged PRs",
  "Changed files and dates",
  "Evidence-linked bullets",
  "Human approval before CV updates",
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GitBranch className="h-5 w-5" />
          </span>
          <span className="font-semibold">Evidence Craft</span>
        </Link>
        <Button asChild variant="secondary">
          <Link href="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="hero-mesh border-y border-border">
        <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-10 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:items-center md:py-20">
          <div className="min-w-0 max-w-3xl">
            <p className="mb-4 text-sm font-medium text-primary">Evidence-backed CV workspace</p>
            <h1 className="break-anywhere text-4xl font-semibold leading-tight sm:text-5xl md:text-7xl">
              Turn forgotten engineering work into proof.
            </h1>
            <p className="break-anywhere mt-6 max-w-2xl text-lg text-muted-foreground">
              Connect GitHub, reconstruct meaningful work from real activity, then review every
              suggestion before it reaches your CV.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/auth">
                  Open workspace <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
                <Link href="/auth">Continue with account</Link>
              </Button>
            </div>
          </div>

          <div className="evidence-visual min-h-[360px] min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm sm:min-h-[440px] sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Work evidence map</p>
                <p className="text-xs text-muted-foreground">Live proof before prose</p>
              </div>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3">
              {proofSignals.map((signal, index) => (
                <div
                  key={signal}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/12 text-primary">
                    {index === 0 ? (
                      <GitBranch className="h-4 w-4" />
                    ) : index === 1 ? (
                      <GitPullRequest className="h-4 w-4" />
                    ) : index === 2 ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </span>
                  <span className="break-anywhere text-sm">{signal}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-dashed border-border p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Generated only after review
              </p>
              <p className="break-anywhere mt-2 text-sm">
                Designed and implemented idempotent webhook processing with retry handling,
                duplicate-event prevention, and failure reconciliation.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-secondary px-2 py-1">3 PRs</span>
                <span className="rounded-md bg-secondary px-2 py-1">11 commits</span>
                <span className="rounded-md bg-secondary px-2 py-1">5 files</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl min-w-0 gap-4 px-4 py-10 sm:grid-cols-3 sm:px-6">
        {[
          ["Recover", "Find substantial work hiding across commits, PRs, and changed modules."],
          ["Verify", "Separate raw evidence, draft suggestions, and user-approved CV copy."],
          ["Publish", "Generate a CV version from work you can actually point to."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="break-anywhere mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
