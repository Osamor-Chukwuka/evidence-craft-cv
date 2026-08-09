import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analyzeRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ repositoryId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { analyzeRepository } = await import("@/server/analysis.server");
    return analyzeRepository(context.userId, data.repositoryId);
  });

export const buildCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ targetRole: z.string().max(120).nullable(), title: z.string().min(1).max(120) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { generateCv } = await import("@/server/cv.server");
    return generateCv(context.userId, data.targetRole, data.title);
  });
