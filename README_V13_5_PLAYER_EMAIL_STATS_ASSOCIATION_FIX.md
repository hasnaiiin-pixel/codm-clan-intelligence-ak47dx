# CLAN MANAGER AK47DX V13.5

Patch mirata sopra V13.4.

## Correzioni
- In Giocatori lo stato Account associato / Da associare usa `players.user_id`, non `uid_codm`.
- L'Owner/Admin può associare direttamente ogni player a una email registrata dalla tabella Giocatori.
- L'associazione collega l'account al player già contenente le statistiche, senza creare un profilo statistico vuoto.
- Email collegata visibile sotto lo stato account.
- Numero Partite calcolato su `match_id` unici.
- Tabella Giocatori corretta per evitare sovrapposizioni tra stato account e numero partite.
- K/D/A resta Kill / Death / Assist.

## Uso
1. Accedere come Owner/Admin.
2. Aprire Giocatori.
3. Nella colonna Associa email registrata selezionare l'email.
4. Premere Associa sulla stessa riga del player che possiede le statistiche.
5. Lo stato diventa Account associato e le statistiche restano visibili sulla stessa riga/profilo.

Non richiede nuovo SQL se sono già stati eseguiti gli aggiornamenti V13.1/V13.3 che aggiungono `players.user_id`.
