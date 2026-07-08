-- ESEMPIO: carica righe staging e poi processa batch.
-- Prima eseguire IMPORT_RISULTATI_EXCEL_STAGING_V12.sql.

insert into public.codm_import_result_rows(
  import_batch_id, source_match_code, partita, data_partita, ora_partita, tipo_partita, modalita_codm, mappa_codm,
  team_nostro, team_blu, team_rosso, risultato_blu, risultato_rosso, giocatore, team_giocatore, kill, death, assist, mvp, foto_file, note
) values
('BATCH_DEMO_V12','CED_20260708_001',1,'2026-07-08','21:00','scrim','CED','Standoff','BLU','AK47DX','AP Clan',6,0,'ѦҞঐṀĬƦƵ','NOSTRO',18,7,4,true,'CED_20260708_001.jpg','Demo V12'),
('BATCH_DEMO_V12','CED_20260708_001',1,'2026-07-08','21:00','scrim','CED','Standoff','BLU','AK47DX','AP Clan',6,0,'Player2','NOSTRO',12,9,6,false,'CED_20260708_001.jpg','Demo V12');

select * from public.codm_process_import_batch('BATCH_DEMO_V12');
