import { createFileRoute, Link } from "@tanstack/react-router";
import { GitBranch, GitPullRequest, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Commit Trail — Evidence-backed developer CVs" },
      {
        name: "description",
        content:
          "Sync your GitHub commits and merged pull requests, review the work you actually did, and generate CV bullets backed by real evidence.",
      },
      { property: "og:title", content: "Commit Trail — Evidence-backed developer CVs" },
      {
        property: "og:description",
        content: "Turn your real git history into a CV you can prove, line by line.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: GitBranch, title: "Sync GitHub", body: "Import repositories and pull commits and merged PRs for any time window." },
  { icon: GitPullRequest, title: "Discover work", body: "Related commits are clustered into substantial engineering work items." },
  { icon: Sparkles, title: "Review & approve", body: "Edit, approve, or reject every item before it can reach your CV." },
  { icon: ShieldCheck, title: "Build the CV", body: "Bullets are generated only from approved, evidence-linked work." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-semibold">commit_trail</span>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="grid-backdrop border-y border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            evidence &gt; adjectives
          </p>
          <h1 className="mt-5 text-4xl font-semibold md:text-6xl">
            Your CV, reconstructed from your git history
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Commit Trail reads your commits and merged pull requests, recovers the engineering work
            behind them, and writes CV bullets you can point at a diff to defend.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start with GitHub</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-20 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <div key={step.title} className="rounded-lg border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2 text-primary">
              <step.icon className="h-4 w-4" />
              <span className="font-mono text-xs">0{index + 1}</span>
            </div>
            <h2 className="mt-3 text-base font-semibold">{step.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/60 py-8 text-center font-mono text-xs text-muted-foreground">
        commit_trail — nothing on your CV that your history can't back up.
      </footer>
    </div>
  );
}
