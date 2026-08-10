import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const uploadCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        fileName: z.string().min(1).max(300),
        mimeType: z.string().min(1).max(200),
        text: z.string().max(200000).optional(),
        fileData: z.string().max(12000000).optional(),
      })
      .refine((v) => Boolean(v.text || v.fileData), { message: "No file content provided" })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { parseCvUpload } = await import("@/server/cv-review.server");
    return parseCvUpload(context.userId, data);
  });

export const compareCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ uploadId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { compareCvToEvidence } = await import("@/server/cv-review.server");
    return compareCvToEvidence(context.userId, data.uploadId);
  });

export const decideCvGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        gapId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        suggestion: z.string().min(1).max(2000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { decideGap } = await import("@/server/cv-review.server");
    return decideGap(context.userId, data.gapId, data.decision, data.suggestion);
  });
