# CLAN MANAGER V12.1 - Import Excel + Foto prova + Profili reali

Flusso consigliato:

1. Dai a ChatGPT le foto delle partite.
2. ChatGPT prepara Excel con ID_PARTITA, risultato, player, K/D/A, MVP e nome foto.
3. In app vai su Import partita.
4. Carica Excel.
5. Non serve OCR se Excel è già compilato.
6. Allega foto prova accanto alla tabella oppure dopo caricando la partita registrata.
7. Abbina i player ai profili reali registrati con il menu Profilo reale/email.
8. Salva o aggiorna la partita su Supabase.

File utili:

- public/templates/TEMPLATE_IMPORT_RISULTATI_CODM_CLAN_MANAGER_V12_1_FOTO_PROFILI.xlsx
- supabase/UPDATE_V12_1_PHOTO_PLAYER_LINK_SUPPORT.sql
- supabase/IMPORT_RISULTATI_EXCEL_STAGING_V12.sql

Note:

- FOTO_FILE serve per ricordare il nome del file prova. La foto va allegata manualmente dalla app oppure può essere indicata con FOTO_URL.
- GIOCATORE_EMAIL e UID_CODM permettono l'abbinamento automatico al profilo registrato.
- Se l'abbinamento automatico non trova il player, puoi assegnarlo manualmente dalla tabella import.
