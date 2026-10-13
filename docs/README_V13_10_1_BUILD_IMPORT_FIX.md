# V13.10.1 - Fix build GlobalTableSorter

Correzione del build Vercel: il componente GlobalTableSorter è stato spostato dentro `app/GlobalTableSorter.tsx` e importato con percorso relativo, perché la regola `.gitignore` `components/` poteva escludere `src/components` dal commit Git.

Nessuna modifica funzionale rispetto alla V13.10.
