"use client";

import { useRouter } from "next/navigation";
import { GitBranch } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  setSupabaseSessionAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await signInWithPasswordAction({ email, password });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  };

  const signUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await signUpWithPasswordAction({
      email,
      password,
      fullName,
      origin: window.location.origin,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Account created. Check your inbox if confirmation is required.");
    router.replace("/dashboard");
    router.refresh();
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    if ("tokens" in result && result.tokens?.access_token && result.tokens?.refresh_token) {
      const session = await setSupabaseSessionAction({
        accessToken: result.tokens.access_token,
        refreshToken: result.tokens.refresh_token,
      });
      if (!session.ok) {
        toast.error(session.message);
        return;
      }
    }
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <main className="auth-backdrop flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md min-w-0 border-border shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GitBranch className="h-5 w-5" />
            </span>
            <span className="font-semibold">Evidence Craft</span>
          </div>
          <CardTitle className="break-anywhere text-2xl">Open your proof workspace</CardTitle>
          <CardDescription className="break-anywhere">
            Sign in to connect GitHub, review recovered work, and build your evidence-backed CV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="secondary" className="min-h-11 w-full" onClick={google}>
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or use email
            <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form className="space-y-3 pt-4" onSubmit={signIn}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="min-h-11 w-full" disabled={busy}>
                  {busy ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form className="space-y-3 pt-4" onSubmit={signUp}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-up">Email</Label>
                  <Input
                    id="email-up"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-up">Password</Label>
                  <Input
                    id="password-up"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="min-h-11 w-full" disabled={busy}>
                  {busy ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
