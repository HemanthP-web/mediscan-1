create type public.app_role as enum ('patient', 'admin');

create table public.profiles (
  id uuid primary key,
  name text not null,
  preferred_lang text not null default 'en',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_ta text,
  uses_en text not null, uses_ta text,
  dosage_en text not null, dosage_ta text,
  side_effects_en text not null, side_effects_ta text,
  precautions_en text not null, precautions_ta text,
  source text not null default 'ai',
  created_at timestamptz not null default now()
);
create unique index medicines_name_lower on public.medicines (lower(name));
grant select, delete on public.medicines to authenticated;
grant all on public.medicines to service_role;
alter table public.medicines enable row level security;
create policy "logged in read medicines" on public.medicines for select to authenticated using (true);
create policy "admin deletes medicines" on public.medicines for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.medicine_lookups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.medicine_lookups to authenticated;
grant all on public.medicine_lookups to service_role;
alter table public.medicine_lookups enable row level security;
create policy "own lookups" on public.medicine_lookups for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_en text not null,
  content_ta text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "own reports" on public.reports for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'patient');
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();