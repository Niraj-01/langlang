-- Weekly League leaderboard — OPTIONAL, and NOT applied automatically.
--
-- The league works offline as a solo tier ladder with zero backend. Apply this
-- ONLY if you want a real cross-user weekly leaderboard, and read the privacy
-- note first — this is the one change in the repo that makes one user's data
-- visible to another.
--
-- WHAT IT EXPOSES (and to whom):
--   * Exposed: a display name + the last 7 days' XP total. Nothing else.
--   * To whom: signed-in users only (`authenticated`). NOT `anon` — an
--     anonymous grant would put your users' names on the public internet.
--   * Only for users who OPTED IN: rows are filtered to
--     state->>'shareLeaderboard' = 'true'. The app defaults this to false and
--     exposes a toggle in Profile → League, so nobody is listed without
--     consent. Users who never opt in are invisible here.
--
-- The base `user_state` table keeps its owner-only RLS untouched; this view is
-- a narrow, read-only projection. `security_invoker = off` (SECURITY DEFINER)
-- is what lets it read across rows despite that RLS — which is exactly why the
-- opt-in filter and the column list below must stay this tight.
--
-- Prerequisites:
--   * user_state(user_id uuid primary key, state jsonb)   -- existing table
--   * the app writes state->>'displayName' and state->>'shareLeaderboard'
--   * per-day XP lives in state->'log', keyed 'YYYY-MM-DD', each {"xp": n}
--
-- Apply from the Supabase SQL editor (or `supabase db push`) when you're ready.

create or replace view public.leaderboard
with (security_invoker = off) as
select
  coalesce(nullif(state->>'displayName', ''), 'Learner') as name,
  (
    select coalesce(sum((v.value->>'xp')::int), 0)
    from jsonb_each(coalesce(state->'log', '{}'::jsonb)) as v(key, value)
    where v.key >= to_char(current_date - interval '6 days', 'YYYY-MM-DD')
      and v.key <= to_char(current_date, 'YYYY-MM-DD')
  ) as weekly_xp
from public.user_state
where coalesce(state->>'shareLeaderboard', 'false') = 'true';

-- Signed-in users only. Deliberately NOT granted to anon.
revoke all on public.leaderboard from anon;
grant select on public.leaderboard to authenticated;

-- The app reads:
--   select name, weekly_xp from leaderboard order by weekly_xp desc limit 30;
--
-- To roll this back completely:  drop view if exists public.leaderboard;
