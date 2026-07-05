# CODM AK47DX V5.2 — Template + K/D/A + Tabella definitivo

Questa release sistema definitivamente il flusso import partite:

- recupero template salvato anche se era stato salvato con altro login/profilo telefono/localStorage;
- salvataggio canonico del template in calibrazione;
- import usa il template canonico/salvato e non torna al default se esiste un template utente;
- backend OCR 2.0.9 con fallback riga intera solo se K/D/A non viene letto dalla cella;
- frontend accetta alias `kills/deaths/assists`, `kill/death/assist`, `k/d/a` e stringhe `kda_raw`;
- overlay backend restituisce tutto il layout applicato, non solo pochi box letti;
- tabella statistiche nostro team a larghezza piena; su telefono usa card complete.

Marker frontend:

```text
V5_2_TEMPLATE_KDA_TABLE_DEFINITIVO_OK
```

Backend OCR Render:

```text
2.0.9-v5-2-template-kda-table-definitivo-ak47dx
```
