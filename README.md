# Beard Laws Casino 2.0.1 — Direct GitHub Pages Build

This package requires no Node installation, Vite build, or GitHub Actions workflow.

Upload the contents directly to the root of the `beard-laws-casino` repository and use:

**Settings → Pages → Deploy from a branch → main → /(root)**

The package uses native browser ES modules and loads PixiJS 8.6.6 from jsDelivr through an import map.

A network connection is required for PixiJS to load.

This direct build is the immediate working deployment path. The separate Source/GitHub Actions package remains the long-term TypeScript development project.
