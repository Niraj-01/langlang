-- Weekly League leaderboard (OPTIONAL — not applied automatically).
--
-- The app's league works offline as a solo tier ladder with zero backend.
-- Apply this migration ONLY if you want a real cross-user weekly leaderboard.
-- It exposes a *minimal, read-only projection* (display name + weekly XP) via a
-- SECURITY DEFINER view, so the base user_state table stays owner-only under RLS
-- and no raw progress state is ever readable by other users.
--
-- Prerequisites:
--   * user_state(user_id uuid pk, state jsonb)  -- existing table
--   * store the user's chosen display name in state->>'displayName' (or adapt below)
--   * store per-day XP in state->'log' keyed by yyyy-mm-dd with {"xp": n}
--
-- Run in the Supabase SQL editor (or `supabase db push`) when you're ready.

create or replace view public.leaderboard
with (security_invoker = off) as
select
  coalesce(nullif(state->>'displayName', ''), 'Learner') as name,
  -- sum XP over the last 7 calendar days from the state->'log' map
  (
    select coalesce(sum((v.value->>'xp')::int), 0)
    from jsonb_each(coalesce(state->'log', '{}'::jsonb)) as v(key, value)
    where v.key >= to_char(current_date - interval '6 days', 'YYYY-MM-DD')
  ) as weekly_xp
from public.user_state;

-- Let authenticated users read the aggregated board (names + weekly XP only).
grant select on public.leaderboard to authenticated, anon;

-- The app reads: select name, weekly_xp from leaderboard order by weekly_xp desc limit 30;
