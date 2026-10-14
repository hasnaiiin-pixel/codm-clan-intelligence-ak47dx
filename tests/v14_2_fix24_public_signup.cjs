const fs=require('fs');const assert=require('node:assert/strict');const base=process.cwd();
const read=f=>fs.readFileSync(`${base}/${f}`,'utf8');
const page=read('app/iscrizione/[id]/page.tsx'),sql=read('supabase/UPDATE_V14_2_FIX24_PUBLIC_SIGNUPS.sql');
const tournament=read('app/tournament/page.tsx'),admin=read('app/tournament/TournamentSignupAdmin.tsx'),exporter=read('app/tournament/TournamentExportCenter.tsx');
assert.match(page,/codm_fix24_public_tournament_info/);assert.match(page,/codm_fix24_public_signup/);assert.match(page,/p_consent:form.privacy/);
assert.match(page,/UID numerico/);assert.match(page,/privacy_url/);assert.match(page,/senza creare un account/);
assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on table public.codm_tournament_public_signups from anon, authenticated/);
assert.match(sql,/security definer set search_path = ''/);assert.match(sql,/grant execute on function public.codm_fix24_public_signup[^\n]*to anon, authenticated/);
assert.match(sql,/unique \(tournament_id, uid\)/);assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/status <> 'Iscrizioni aperte'/);
assert.match(sql,/codm_fix24_is_tournament_staff/);assert.match(sql,/codm_fix24_review_signup/);assert.match(sql,/codm_fix24_edit_signup/);assert.match(sql,/codm_fix24_delete_signup/);assert.match(sql,/insert into public.codm_tournament_registrations/);
assert.match(admin,/navigator.clipboard.writeText/);assert.match(admin,/codm_fix24_review_signup/);
assert.match(tournament,/<TournamentSignupAdmin/);assert.match(tournament,/<TournamentExportCenter/);assert.match(tournament,/public_signup_privacy_url/);
assert.match(exporter,/XLSX\.writeFile/);assert.match(exporter,/jsPDF/);assert.match(exporter,/PDF pubblico/);assert.match(exporter,/Iscritti/);assert.match(exporter,/Classifiche/);assert.match(exporter,/Winners/);
assert.match(exporter,/\[=\+\\-@\]/); // formula guard
console.log('FIX24: 29 checks passed: public signup, privacy, SQL/RLS, sync, export.');
