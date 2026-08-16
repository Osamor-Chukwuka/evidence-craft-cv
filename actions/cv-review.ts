"use server";

import { z } from "zod";

import { requireUser } from "@/integrations/supabase/server";

export async function uploadCvAction(input: unknown) {
  const data = z
    .object({
      fileName: z.string().min(1).max(300),
      mimeType: z.string().min(1).max(200),
      text: z.string().max(200000).optional(),
      fileData: z.string().max(12000000).optional(),
    })
    .refine((value) => Boolean(value.text || value.fileData), { message: "No file content provided" })
    .parse(input);
  const { userId } = await requireUser();
  const { parseCvUpload } = await import("@/server/cv-review.server");
  return parseCvUpload(userId, data);
}

export async function compareCvAction(input: unknown) {
  const data = z.object({ uploadId: z.string().uuid() }).parse(input);
  const { userId } = await requireUser();
  const { compareCvToEvidence } = await import("@/server/cv-review.server");
  return compareCvToEvidence(userId, data.uploadId);
}

export async function decideCvGapAction(input: unknown) {
  const data = z
    .object({
      gapId: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      suggestion: z.string().min(1).max(2000).optional(),
    })
    .parse(input);
  const { userId } = await requireUser();
  const { decideGap } = await import("@/server/cv-review.server");
  return decideGap(userId, data.gapId, data.decision, data.suggestion);
}
