-- Store body-type analysis results per user (photos + analysis) for history and use in suggestions.
CREATE TABLE IF NOT EXISTS body_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  analysis JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_body_analyses_user_created ON body_analyses(user_id, created_at DESC);

ALTER TABLE body_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own body analyses"
  ON body_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body analyses"
  ON body_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
