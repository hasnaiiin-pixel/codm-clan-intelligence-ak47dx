# 0.9C — Correzione permanente calibrazione/import

## Problema risolto

La calibrazione veniva salvata, ma ricaricando immagine o passando alla pagina import poteva sembrare persa. Le cause erano:

- template legato a user key diversa tra `anonymous` e login reale;
- import non mostrava quale template stava usando;
- backend applicava coordinate su immagine dopo trim dei bordi, mentre frontend calibrava sull'immagine originale.

## Soluzione

- Salvataggio multi-chiave: user corrente, fallback anonymous e last-active.
- Import con selettore esplicito template telefono.
- Backend con calibrazione attiva usa screenshot originale ridimensionato, senza trim.
- Aggiunto box data/ora partita.
