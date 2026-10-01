# MediAid Hub

# MediScan AI — Single-Shot Prompt for Bolt.new / Bolt.ai



> **Before you paste this:** click **"Connect to Supabase"** in the top-right of Bolt first, so a Supabase project is linked and the env vars are set automatically. Then paste everything below as your first message.



---



Build a complete, working full-stack web app called **MediScan AI** — a bilingual (English/Tamil) medicine-information website. Build it as a website, not a mobile app. Generate the entire app now, fully wired end to end, not a partial scaffold.



## Tech stack



- **Frontend:** React + TypeScript + Vite, styled with Tailwind CSS

- **Routing:** React Router

- **Backend/DB/Auth:** Supabase (Postgres database, Supabase Auth for email/password, Row Level Security for data access)

- **AI:** OpenAI API called **only** from a Supabase Edge Function (never from the browser), using model `gpt-4o-mini` with JSON mode. Add `OPENAI_API_KEY` as a Supabase Edge Function secret.

- **Validation:** Zod on every form and every Edge Function input



## Database schema (create as a Supabase migration)



```sql

create type user_role as enum ('patient', 'admin');



create table profiles (

  id uuid primary key references auth.users(id) on delete cascade,

  name text not null,

  role user_role not null default 'patient',

  preferred_lang text not null default 'en',

  created_at timestamptz not null default now()

);



create table medicines (

  id uuid primary key default gen_random_uuid(),

  name text not null unique,

  name_ta text,

  uses_en text not null,

  uses_ta text,

  dosage_en text not null,

  dosage_ta text,

  side_effects_en text not null,

  side_effects_ta text,

  precautions_en text not null,

  precautions_ta text,

  source text not null default 'ai',

  created_at timestamptz not null default now()

);



create table medicine_lookups (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references profiles(id) on delete cascade,

  medicine_id uuid not null references medicines(id) on delete cascade,

  note text,

  created_at timestamptz not null default now()

);



create table reports (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references profiles(id) on delete cascade,

  content_en text not null,

  content_ta text,

  created_at timestamptz not null default now()

);



alter table profiles enable row level security;

alter table medicines enable row level security;

alter table medicine_lookups enable row level security;

alter table reports enable row level security;



-- profiles: a user can read/update only their own row; admins can read all

create policy "read own profile" on profiles for select using (auth.uid() = id);

create policy "update own profile" on profiles for update using (auth.uid() = id);

create policy "admin reads all profiles" on profiles for select using (

  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')

);



-- medicines: any logged-in user can read; only the service role (Edge Function) inserts;

-- only admins can delete

create policy "logged in users read medicines" on medicines for select using (auth.role() = 'authenticated');

create policy "admin deletes medicines" on medicines for delete using (

  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')

);



-- medicine_lookups: a user can read/insert/update only their own rows

create policy "own lookups" on medicine_lookups for all using (auth.uid() = user_id) with check (auth.uid() = user_id);



-- reports: a user can read/insert only their own rows

create policy "own reports" on reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

```



On every new signup (Supabase Auth trigger or client-side after sign-up), insert a matching row into `profiles` with the user's name and role `patient`.



## Supabase Edge Functions



### `lookup-medicine`

Input: `{ name: string }` (2–100 chars, validate with Zod).

1. Require a valid Supabase auth session; reject with 401 otherwise.

2. Case-insensitive search `medicines` for `name`. If found, return it.

3. If not found, call OpenAI (`gpt-4o-mini`, JSON mode) with this exact system prompt:

   > "You are a medical-information assistant for a patient education app. Given a medicine name, respond ONLY with a JSON object (no markdown, no extra text) with exactly these keys: uses_en, uses_ta, dosage_en, dosage_ta, side_effects_en, side_effects_ta, precautions_en, precautions_ta. 'en' fields are plain, simple English; 'ta' fields are the same content in Tamil. Keep each field to 2–3 short sentences. Never give an exact dosage number for a specific patient — describe typical/common adult dosing only, and say it varies by patient. Do not diagnose, do not recommend starting/stopping a medicine. If the name is not a recognizable medicine, still return the JSON object with fields explaining that it could not be identified."

4. Insert the parsed result into `medicines` (`source = 'ai'`) and return it.

5. Either way, insert a row into `medicine_lookups` linking the user and the medicine.



### `generate-report`

Input: none (uses the caller's session).

1. Require a valid session; reject with 401.

2. Read the user's latest 50 `medicine_lookups` joined with `medicines` (name, date, note).

3. If there are none, return a 400 error: "Look up at least one medicine before generating a report."

4. Call OpenAI with a system prompt that asks for a neutral, plain-language summary of the medicines tracked, patterns in the notes described without diagnosis, and a closing reminder to consult a doctor or pharmacist. Ask for JSON with exactly `content_en` and `content_ta`, each 150–250 words.

5. Insert into `reports` and return it.



## Pages and features



- **Landing page (`/`)** — app name, tagline, language switcher, Login/Register buttons, 3 feature cards (medicine lookup, history, AI reports).

- **Register (`/register`) / Login (`/login`)** — Supabase Auth email+password; labelled inputs; inline error messages.

- **Dashboard (`/dashboard`, protected)** — greeting, medicine search box (calls `lookup-medicine`, then navigates to the medicine page), two summary cards (total lookups, unique medicines), 3 most recent lookups.

- **Medicine page (`/medicine/:name`, protected)** — shows uses, dosage, side effects, precautions in the selected language (fallback to English if Tamil is empty), plus a fixed disclaimer: "MediScan AI provides general information only and is not a substitute for advice from a licensed doctor or pharmacist." (also in Tamil).

- **History (`/history`, protected)** — timeline of the user's lookups, newest first, each with an editable note (saved via a direct Supabase update, RLS-protected).

- **Reports (`/reports`, protected)** — list of past reports + "Generate new report" button (calls `generate-report`); **Report detail (`/reports/:id`)** — shows the bilingual summary with a "Print / Save as PDF" button and a print stylesheet that hides navigation and switches to a white page.

- **Admin (`/admin`, protected, role = admin only)** — table of all profiles, table of all cached medicines with a delete button (admin only, enforced by RLS).

- **Language switcher** — persistent English/Tamil toggle in the header on every page, stored in `localStorage` and in `profiles.preferred_lang` once logged in; a React context exposes `t(key)` from an English/Tamil dictionary for every static UI string.



## Design direction (important — do not use a generic default theme)



- **Aesthetic:** dark glassmorphism — translucent frosted-glass cards over a deep charcoal background, soft blur, subtle border highlight. Calm and trustworthy, not clinical or flashy.

- **Palette:** background `#0B0E11`; glass surface `rgba(255,255,255,0.04)` with a `1px solid rgba(255,255,255,0.08)` border and `16px` backdrop blur; primary accent teal `#14B8A6` (buttons, links, focus outline); secondary accent amber `#F59E0B` (errors/alerts); text `#E7ECEF`; muted text `#8A97A0`; `14px` card corner radius.

- **Typography:** "Space Grotesk" for headings, "Inter" for body text, "JetBrains Mono" for timestamps/technical text (load from Google Fonts).

- Responsive: sidebar/nav stacks on mobile; forms and cards are fluid width.

- No stock medical-cross icons, no generic hospital photography.



## Safety and correctness rules



- The OpenAI key must only ever be read inside the Edge Functions — never in frontend code or `.env` exposed to Vite (no `VITE_OPENAI_API_KEY`).

- Every medicine page and every report must show the disclaimer.

- Validate all Edge Function inputs with Zod and return proper 400/401 errors.

- Handle AI/network failures with a friendly inline error, never a crash.



Build the complete app now: project scaffold, the SQL migration, both Edge Functions, all pages/components above, the language dictionary (English + Tamil) with every static string translated, and the styling — fully working end to end, ready to run.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/856fca83-f0a0-4773-9dce-c0f96fcf4946).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
