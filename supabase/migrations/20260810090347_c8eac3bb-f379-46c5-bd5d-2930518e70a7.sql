CREATE TABLE public.cv_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text,
  source_text text NOT NULL DEFAULT '',
  parsed jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_uploads TO authenticated;
GRANT ALL ON public.cv_uploads TO service_role;
ALTER TABLE public.cv_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cv uploads" ON public.cv_uploads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cv_uploads_updated BEFORE UPDATE ON public.cv_uploads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cv_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL REFERENCES public.cv_uploads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'vague',
  section text,
  cv_excerpt text,
  issue text NOT NULL,
  suggestion text NOT NULL,
  skills text[] NOT NULL DEFAULT '{}'::text[],
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending',
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE SET NULL,
  model text,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_gaps TO authenticated;
GRANT ALL ON public.cv_gaps TO service_role;
ALTER TABLE public.cv_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cv gaps" ON public.cv_gaps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cv_gaps_updated BEFORE UPDATE ON public.cv_gaps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX cv_gaps_user_status_idx ON public.cv_gaps (user_id, status);
CREATE INDEX cv_uploads_user_idx ON public.cv_uploads (user_id, created_at DESC);