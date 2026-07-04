# CODM AK47DX - Admin Users Type Fix

## Problema
La build falliva con:

```txt
./app/admin/users/page.tsx:52:16
Type error: Conversion ... profiles ... { display_name }[] non compatibile con { display_name }
```

Supabase, quando fai una select con relazione `profiles(display_name)`, può restituire `profiles` come array. La pagina admin utenti invece lo trattava come oggetto singolo.

## Soluzione
Il fix normalizza i dati prima di salvarli nello stato React:

```ts
const normalizedMembers = (memberData || []).map((m: any) => ({
  ...m,
  profiles: Array.isArray(m.profiles) ? (m.profiles[0] || null) : (m.profiles || null),
}));
setMembers(normalizedMembers as Member[]);
```

## Come applicare
Esegui dalla root del progetto:

```bat
APPLICA_CODM_ADMIN_USERS_TYPE_FIX.bat
```

Poi:

```bat
git add -A
git commit -m "fix: normalize admin users profile relation type"
git push origin main
```

Dopo il deploy, Vercel deve superare `Linting and checking validity of types`.
