"use server";

import { z } from "zod";

import { createSupabaseServerClient } from "@/integrations/supabase/server";

const emailPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signUpSchema = emailPasswordSchema.extend({
  fullName: z.string().min(1).max(160),
  origin: z.string().url(),
});

export async function signInWithPasswordAction(input: unknown) {
  const data = emailPasswordSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (error) {
    console.error("Supabase password sign-in failed", error);
    return { ok: false, message: "Could not reach Supabase Auth. Check your network and Supabase environment variables." };
  }
}

export async function signUpWithPasswordAction(input: unknown) {
  const data = signUpSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  try {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${data.origin}/dashboard`,
        data: { full_name: data.fullName },
      },
    });

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (error) {
    console.error("Supabase password sign-up failed", error);
    return { ok: false, message: "Could not reach Supabase Auth. Check your network and Supabase environment variables." };
  }
}

export async function setSupabaseSessionAction(input: unknown) {
  const data = z
    .object({
      accessToken: z.string().min(1),
      refreshToken: z.string().min(1),
    })
    .parse(input);
  const supabase = await createSupabaseServerClient();
  try {
    const { error } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (error) {
    console.error("Supabase session bridge failed", error);
    return { ok: false, message: "Could not create a server session. Check your Supabase configuration." };
  }
}
