# AK47DX FIX31D — LEXO + screenshot non abbinati

## Che cosa risolve
La rubrica iniziale escludeva L.E.X.O e RENDO perche' lo stesso UID era indicato per entrambi. Il nickname `LEXO` proveniente dallo screenshot appariva pertanto come **Non abbinato**. Non e' opportuno copiare automaticamente un UID o associare un telefono senza verifica.

- Con lo SQL FIX31D, **LEXO** viene collegato se esiste un solo contatto con nickname CODM equivalente; altrimenti viene creata una scheda `AKঐLEXO` con **stato `Da verificare`**, senza UID, telefono o dati inventati. La procedura e' idempotente (non duplica LEXO rieseguendo lo SQL). Il prefisso `AKঐ` resta una trascrizione provvisoria da confrontare con lo screenshot originale.
- In **Rubrica > Nomi da screenshot**, per gli altri profili `Non abbinato` ora e' disponibile **Collega scheda esistente** oppure **Importa come incompleto**, ciascuno dopo conferma Admin. Sono evidenziati i campi UID e telefono mancanti; i profili creati non risultano automaticamente attivi.
- Se una scheda e' stata collegata, cliccare **Conferma nome** soltanto dopo aver confrontato i caratteri effettivi CODM.
- Lo SQL e' da eseguire *una sola volta* dopo le migrazioni FIX31B e FIX31C; non cambiare gli UID RENDO/LEXO finche' non sono stati verificati.

## Installazione
1. Fare backup Supabase dei contatti e del repository; aprire SQL Editor e copiare **supabase/UPDATE_V14_2_FIX31D_IMPORTA_NON_ABBINATI.sql** dall'archivio ZIP, poi **Run**. Il report finale mostra stato LEXO e campi da verificare. La migrazione puo' essere ripetuta senza creare duplicati di LEXO.
2. Copiare *il contenuto* della patch FIX31D nella radice progetto FIX31C (preservare `.git`, `.env.local`, `node_modules`). Non aggiungere dati personali al repo.
3. Su Windows:
```
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm run test:fix31d
npm run test:fix31c
npm run build
git add -A
git commit -m "AK47DX FIX31D gestione nomi CODM incompleti"
git push origin main
```
4. Aprire Rubrica / Nomi da screenshot; LEXO viene mostrato **Da verificare**; controllare l'UID effettivo in CODM prima di completarlo. I nomi non abbinati si risolvono singolarmente tramite i pulsanti della scheda.

## Limiti e privacy
- Le foto CODM sono da associare a schede verificate, non vengono importate automaticamente.
- Lo stato `Da verificare` esclude le nuove schede da "solo attivi" e dalla lettura di base riservata ai membri.
- Le due funzioni richiedono account registrato con permessi server `manage_access`, `edit_contacts`, `change_nickname` e `view_contacts`.
- La build Next.js e SQL sul database reale non sono stati eseguiti in questo ambiente: **TEST**.
