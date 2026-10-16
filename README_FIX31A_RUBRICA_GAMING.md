# AK47DX FIX31A Rubrica Gaming — patch TEST

## Modifiche
- Nome **in CODM** sempre in primo piano. Schede gaming, nuove icone di ruolo, campi nickname/UID/telefono incompleti marcati in rosso (telefono soltanto ai ruoli autorizzati a leggerlo).
- Nuovo sottomenu **🏆 Organigramma** con gerarchia Fondataore/Capo, Co-Capi/Vice, responsabili/Staff, direzione provvisoria, membri e riserve. Grafico alimentato dai ruoli effettivamente assegnati in Supabase; nessun ruolo assegnato inventato.
- Nuovi ruoli Clan selezionabili: Responsabile Tornei, Responsabile Scrim, Responsabile Reclutamento, Allenatore, Moderatore, Riserva, Ospite, Ex membro.
- **Profilo prima, Modifica dopo:** clic nickname apre la scheda; pulsante Modifica abilita i campi. Foto CODM e foto personale restano private, senza i campi URL visibili; secondo telefono rimosso dal modulo (i dati storici non vengono eliminati).
- Preset **🎮 Membro (solo nickname + UID)**: account AK47DX registrato e autorizzato dall'Owner, non visitatore anonimo. SQL limita le risposte dal server a nickname, UID, ruolo e stato dei soli attivi. L'Admin può assegnare permessi più ampi singolarmente. Lo storico nickname, anagrafica, telefoni, date di nascita, città, foto e note sono esclusi dalla RPC dei membri.
- **Screenshot FIX30**: pulsante Admin per applicare in blocco SOLO gli abbinamenti `exact` con corrispondenza unica. Ogni nickname precedente va nello storico. Gli ambigui, duplicati e non trovati sono evidenziati in rosso. Import dei candidati FIX30 richiesto in anticipo. Il testo trascritto dagli screenshot può richiedere controllo dei simboli: conferma solo i nomi di cui sei sicuro.
- Export WhatsApp: filtro **Solo attivi** predefinito, **blocco unico**, versione Admin con i campi consentiti e versione condivisibile con condivisione telefono autorizzata. Non condivide automaticamente i numeri senza consenso.
- Gli altri moduli (Tornei, Scrim, Statistiche) non sono stati modificati.

## Installazione corretta
1. **Backup** di progetto e database, poi applicare la patch nella cartella principale sopra la FIX30 funzionante (i file della patch sono già in struttura radice). Non eliminare `.git`, `.env.local`, `node_modules`.
2. Supabase SQL Editor: eseguire `supabase/UPDATE_V14_2_FIX31_RUBRICA_GAMING_MEMBRI.sql` (presuppone i precedenti FIX29 e FIX30 Rubrica già applicati).
3. Se la tab “Nomi da screenshot” è vuota, eseguire **una sola volta** `supabase/UPDATE_V14_2_FIX30_NOMI_SCREENSHOT_PREVIEW.sql`. Controllare i nomi e applicare gli `exact` con il nuovo pulsante, senza procedere sui casi ambigui.
4. Sul PC: `npm run test:fix31`, `npm run test:fix30`, `npm run test:rubrica`, `npm run build`. **Non eseguire npm ci** se dipendenze presenti.
5. Pubblicare su `main` SOLO dopo test e verifica autorizzazioni: `git add -A`, `git commit -m "AK47DX FIX31A rubrica gaming organigramma permessi"`, `git push origin main`.
6. Verificare `/version` (FIX31A), `/rubrica`, l'organigramma, la scheda/profilo e l'elenco incompleti. Aprire anche come utente registrato con il solo preset Membro: deve vedere esclusivamente i nickname e UID degli attivi, mai telefoni o anagrafica.

## Limiti e verifiche aperte
- **TEST**: qui sono stati eseguiti test di sintassi e controlli automatici. Non compilata la build Next.js completa né testate le RPC su database di produzione: verificare sul PC e nel progetto Supabase reale.
- **Non vengono applicati automaticamente** tutti i nickname dello screenshot, perché 11 sono ambigui e 17 non hanno corrispondenza sicura. Il pulsante di import conferma soltanto i match esatti uno-a-uno.
- Il requisito precedente di **Google Places per la mappa** richiede configurazione di API key e billing Google, e la correzione del flusso geocoding/salvataggio andrà verificata separatamente: non è introdotto da questa patch FIX31A.
- L'invio messaggi WhatsApp resta manuale dopo l'apertura dell'app.
- I dati privati originali (numeri, immagini estratte, UID individuali) NON sono inclusi nella patch né devono essere caricati nel repository.
