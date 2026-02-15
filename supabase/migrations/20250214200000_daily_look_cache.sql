-- Cache "Today's Generated Look" per user per day to avoid repeated weather/location API calls.
-- date = calendar day (YYYY-MM-DD) in user's local time when the look was generated.
CREATE TABLE IF NOT EXISTS daily_look_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weather_high_f INTEGER NOT NULL,
  weather_low_f INTEGER NOT NULL,
  description TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_look_cache_user_date ON daily_look_cache(user_id, date);

-- RLS: users can read/insert/update only their own rows
ALTER TABLE daily_look_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily look cache"
  ON daily_look_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily look cache"
  ON daily_look_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily look cache"
  ON daily_look_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
