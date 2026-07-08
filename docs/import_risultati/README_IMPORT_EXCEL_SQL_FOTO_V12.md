# CLAN MANAGER V12 - Import risultati Excel + foto + SQL

## Metodo consigliato
1. Dai a ChatGPT gli screenshot delle partite.
2. ChatGPT compila `TEMPLATE_IMPORT_RISULTATI_CODM_CLAN_MANAGER_V12_DEFINITIVO.xlsx`.
3. ChatGPT prepara anche la cartella `foto_partite` con gli stessi nomi indicati in `FOTO_FILE`.
4. Nell'app vai in `Import partita` e carica l'Excel.
5. Se ci sono più ID_PARTITA scegli la partita dalla tendina.
6. Allega la foto subito oppure dopo nella partita salvata.
7. Premi Salva partita: la app valida e salva su Supabase.

## Metodo SQL
Usa `supabase/IMPORT_RISULTATI_EXCEL_STAGING_V12.sql` per creare tabella staging e funzione.
Poi puoi caricare CSV/INSERT in `codm_import_result_rows` e lanciare:

```sql
select * from public.codm_process_import_batch('BATCH_20260708_AK47DX');
```

## Regola Excel
Una riga = un giocatore.
Stesso `ID_PARTITA` = stessa partita.
