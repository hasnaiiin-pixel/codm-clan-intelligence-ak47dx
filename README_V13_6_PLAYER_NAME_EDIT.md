# CLAN MANAGER AK47DX V13.6

Patch mirata sopra V13.5.

## Modifica inclusa

Nella pagina **Giocatori**, Owner/Admin/Staff con permessi di scrittura può modificare il nome del giocatore direttamente nella riga del player.

La modifica aggiorna solo `players.nickname` e mantiene invariati:
- ID del player;
- account email associato (`user_id`);
- statistiche già registrate;
- storico partite;
- UID CODM;
- clan e ruoli.

Sono presenti controlli per nome vuoto e duplicato.

## Installazione

```bash
npm ci --legacy-peer-deps
npm run build
```

Non serve SQL aggiuntivo.
