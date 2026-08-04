# Publish V35

1. Copy V35 over the existing casino repository.
2. Keep the existing `.env` file containing the working Supabase Project URL and anon public key.
3. In VS Code, right-click `PUBLISH-V35.ps1` and choose **Run with PowerShell**, or run:

   `powershell -ExecutionPolicy Bypass -File .\PUBLISH-V35.ps1`

4. Confirm the script says the V35 production files are ready in `/docs`.
5. Run:

   `git add -A`

   `git commit -m "Publish V35 restored tribute casino"`

   `git push origin main`

The publish script stops immediately if `.env` is missing. This prevents another GitHub build with disconnected login buttons.
