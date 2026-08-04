# Publish V36

1. Copy V36 over the current casino repository.
2. Keep the existing `.env` file in the repository root. Do not share or upload that file.
3. In the VS Code terminal, run:

   `powershell -ExecutionPolicy Bypass -File .\PUBLISH-V36.ps1`

4. When the script confirms that `/docs` is ready, run these commands one at a time:

   `git add -A`

   `git commit -m "Publish V36 mobile cabinet and interactive Encore"`

   `git push origin main`

5. Wait for GitHub Pages to deploy, open the live casino, and force-refresh with `Ctrl + F5`.
6. Test cloud login, Megh's portrait, Megh's bonus choice, and Beard Bank in portrait orientation.

The script stops before building if `.env` is missing. This prevents publishing a version with disconnected account controls.
