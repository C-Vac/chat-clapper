# Wow Vegas Chat Tweaks - Configuration UI 🎨

This directory holds the frontend application that acts as the control panel for the Wow Vegas Chat Tweaks userscripts.

**Purpose:**

* Provides a user interface (built with React + TypeScript, powered by Vite) for managing the configuration settings (target sites, blocked users, CSS selectors, global options) for the consolidated userscripts in the `wow-vegas-chat-tweaks` project.
* This UI runs locally (usually via `file://` for the final version) and saves its configuration using `GM_setValue`, which the main Tampermonkey script then reads using `GM_getValue`.

**Tech Stack:**

* Vite (Build tool & Dev Server)
* React (UI Library)
* TypeScript (Type Safety)

**Key Files/Folders:**

* `package.json`: Lists Node.js dependencies and scripts (`dev`, `build`, `lint`).
* `vite.config.ts`: Configuration for the Vite dev server and build process.
* `src/`: The main React application code.
    * `App.tsx`: Main application component.
    * `components/`: Reusable UI pieces (buttons, inputs, tabs, etc.).
    * `services/configService.ts`: Crucial helper functions (`loadConfig`, `saveConfig`) designed to interact with `GM_getValue`/`GM_setValue`. Includes fallbacks (like using `localStorage`) for when running in the Vite dev server where the real `GM_*` functions aren't available.

**Development:**

1.  Make sure you got Node.js and npm/yarn/pnpm installed.
2.  Navigate here: `cd dashboard-ui`
3.  Install dependencies: `npm install`
4.  Start the dev server: `npm run dev`
5.  Open the local URL (e.g., `http://localhost:5173`) shown in your terminal.
    * In this dev mode, the `configService.ts` will likely use `localStorage` or a default object because the real Tampermonkey `GM_*` functions aren't injected by the script here. This is just for building and testing the UI components visually.

**Building for Production Use:**

1.  Run the build command: `npm run build`
2.  This creates optimized static files (HTML, CSS, JS) in the `dist/` folder.
3.  The `dist/index.html` file is what you'll typically open using a `file:///` path in your browser for *actual* configuration management.

**Connecting to the Tampermonkey Script:**

* For the UI to actually load and save the *real* configuration used by the script:
    1.  The main `wow-vegas-chat-tweaks/chat-clapper.user.js` script must be installed and running in Tampermonkey.
    2.  That script MUST have a `@match` directive that includes the specific `file:///` path to the `dashboard-ui/dist/index.html` file (or wherever you place the built UI).
    3.  When you open that `file:///` path, the script injects the real `GM_getValue` and `GM_setValue` functions, which the `configService.ts` (if written correctly) should detect and use.

---

Keep this UI clean and easy to use, it's the command center for the whole damn operation! 👑✨