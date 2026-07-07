select id, pg_typeof(id) as id_type, name, tag, owner_user_id from public.clans;
select count(*) as eventi from public.codm_events;
select id, title, starts_at, reminder_minutes, sent_reminders, event_plan->>'teamBName' as avversario from public.codm_events order by created_at desc limit 20;
select count(*) as templates_ocr from public.codm_ocr_templates;
