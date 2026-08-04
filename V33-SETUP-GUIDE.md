# Beard Laws Casino V33 setup

V33 remains fully playable in Guest Mode. Complete these steps to enable real
email accounts and cross-device cloud saves.

## 1. Create the backend

1. Create a free Supabase project.
2. Open its SQL Editor.
3. Paste and run the complete contents of `supabase-setup.sql`.
4. In Authentication > URL Configuration, set the Site URL to:
   `https://beard-laws.github.io/beard-laws-casino/`
5. Add the same address under Redirect URLs.

## 2. Connect the casino

1. Copy `.env.example` to a new file named `.env.local`.
2. In Supabase Project Settings > API, copy the Project URL and public anon key.
3. Paste those two public values into `.env.local`.
4. Never use the service-role key in this website.

## 3. Test locally

```powershell
npm.cmd install
npm.cmd run dev
```

Create one account, confirm its email if confirmation is enabled, load a
fictional bankroll, sign out, then sign back in and verify the wallet returns.

## 4. Publish

```powershell
npm.cmd run build
git add -A
git commit -m "Publish Beard Laws Casino V33 account platform"
git push origin main
```

The committed `docs` folder is the GitHub Pages build. Do not commit
`.env.local`; Vite injects its public values during the build and `.gitignore`
keeps the local file out of Git.

## Security model

Each cloud row belongs to one authenticated user. Supabase row-level security
prevents another signed-in player from reading or changing that row. These are
fictional entertainment credits only; the project does not process payments,
prizes, deposits, or withdrawals.
