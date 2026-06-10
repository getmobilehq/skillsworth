-- Admin flag for the calibration team (Ashley/Blessing). (handoff §8, §20)
-- Admin routes verify this server-side, then operate via the service role
-- (lib/supabase/admin.ts). RLS still hides questions.correct_index from the
-- normal client regardless of this flag.
alter table profiles add column is_admin boolean default false;

-- Grant admin by email after a user signs up, e.g.:
--   update profiles set is_admin = true
--   where id = (select id from auth.users where email = 'ashley@example.com');
