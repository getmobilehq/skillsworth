-- M5: anonymous safeguarding reporting (handoff §13 — a programme design
-- requirement, independent of any BPO operator, available throughout).
--
-- Reports are submitted ANONYMOUSLY: the submit path uses the service role on
-- the server and requires no auth, so a reporter need not be signed in. No
-- foreign key to a user; contact details are optional and reporter-supplied.
create table safeguarding_reports (
  id uuid primary key default gen_random_uuid(),
  about text not null,            -- what happened
  operator text,                  -- optional: which operator/context
  contact text,                   -- optional: how to reach them back
  status text not null default 'open', -- open | reviewed
  reviewed_by uuid,
  note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

-- RLS on, NO policies: reachable only via the service role (anonymous submit
-- on the server, admin review). Never exposed to the client directly.
alter table safeguarding_reports enable row level security;
