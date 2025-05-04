# 🎤 Chat Clapper 👏🏿

Yo! This project is a dynamic Tampermonkey userscript system designed to automatically clap back (replace) messages from specified users on configured chat websites. It features a local configuration UI to manage target sites, users, CSS selectors, and global settings without needing to edit the script code directly.

Keepin' it 💯 since Saturday, May 3, 2025. Straight out tha Goblinverse

## 🏗️ Project Structure

This whole operation is split into two main hustles: the script itself and the UI to boss it around.

/chat-clapper/
│
├── script/         <-- The brains: Tampermonkey script & testing lab
│   ├── chat-clapper.user.js  # The actual userscript file to install
│   ├── tests/                # Test files, mocks, sample data
│   │   ├── fixtures/         # Sample configs (config.dev.json), HTML snippets (.txt)
│   │   ├── mocks/            # Fake GM_API, etc. for testing outside browser
│   │   └── *.test.ts         # Test files (using Vitest)
│   ├── package.json          # Node.js dev dependencies for testing (Vitest, JSDOM)
│   ├── tsconfig.json         # TypeScript config for tests
│   └── vitest.config.ts      # Vitest config (uses JSDOM environment)
│
├── ui/             <-- The face: Local config UI (Vite + React + TS)
│   ├── src/                  # React source code (components, services...)
│   │   └── services/         # configService.ts handles loading/saving (mocks for dev)
│   ├── vite.config.ts        # Vite config
│   ├── package.json          # Node.js dependencies for the UI build/dev server
│   └── ...                   # Standard Vite/React project files
│
└── README.md       <-- You are here, playa!


## 🛠️ Development Setup & Workflow

Get yo' tools ready: Node.js (latest LTS recommended), npm/yarn/pnpm, and a browser with Tampermonkey (or equivalent userscript manager).

**1. Developing the Script Logic (`./script`)**

This is where you test the core message-finding and replacing logic without needing a live website or Tampermonkey installed.

* `cd script`
* `npm install` (Installs Vitest, JSDOM, etc.)
* `npm run test` (Or `npx vitest run`, `npx vitest watch`)
    * This runs the tests defined in `*.test.ts`.
    * It uses the mocked `GM_getValue`/`GM_setValue` (see `tests/mocks/gmAPI.mock.js`) which reads/writes from `tests/fixtures/config.dev.json` by default.
    * It uses JSDOM to simulate a browser DOM, allowing tests for `querySelector`, DOM manipulation, and potentially `MutationObserver`.
* Edit `chat-clapper.user.js` with your script logic. Refactor into testable functions where possible.

**2. Developing the Configuration UI (`./ui`)**

This is where you build the React interface for managing the settings.

* `cd ui`
* `npm install`
* `npm run dev`
    * Starts the Vite development server (e.g., `http://localhost:5173`).
    * Open this URL in your regular browser.
    * The UI uses `src/services/configService.ts` to load/save settings. In **dev mode**, this service likely uses browser `localStorage` as a fallback (or reads a dev JSON) because the real `GM_*` functions aren't available here.
* Build the React components for managing global settings, site tabs, user lists, HTML pasting/analysis, and selectors.

**3. Integration Testing (The Real Deal ✨)**

This is where you test the *whole system* working together in a real browser with Tampermonkey.

1.  **Install Script:** Make sure the latest version of `./script/chat-clapper.user.js` is installed and **enabled** in Tampermonkey.
2.  **Configure `@match`:** Double-check the `@match` directives inside `chat-clapper.user.js`. They MUST include patterns for:
    * All target chat websites you want to monitor.
    * The `file://` path to your configuration HTML page (e.g., `file:///C:/Users/YourUser/Projects/chat-clapper/ui/dist/index.html` or wherever it lives).
3.  **Prepare Config UI:**
    * You need the HTML page for the UI. Either:
        * Build the React UI: `cd ui && npm run build`. Use the generated `index.html` from the `ui/dist/` folder.
        * Or, create a simpler static `config.html` file manually based on your UI design.
4.  **Open Config UI:** Open the `config.html` page using its `file:///` path in the browser where Tampermonkey is running the script.
5.  **Test Saving:** Use the UI. Add site configurations, user lists, selectors. Click "Save".
    * *Crucially:* The `chat-clapper.user.js` running *on this `file://` page* should provide the *real* `GM_setValue` function, which the UI's `configService.ts` (if written correctly) should detect and use to save the configuration object. Check the browser console for logs from the service/script.
6.  **Test Loading:** Reload the `config.html` page. The UI should load the settings you just saved using the *real* `GM_getValue`.
7.  **Test on Target Site:** Navigate to one of the chat websites you configured.
8.  **Check Console:** Open the Developer Console (F12). Look for logs from `chat-clapper.user.js`:
    * Confirm it loads the config via `GM_getValue`.
    * Confirm it correctly identifies the site based on the URL pattern.
    * Confirm it finds the chat container element.
    * Confirm the `MutationObserver` starts watching.
9.  **Trigger Blocking:** Have a configured "blocked" user send a message (or find an existing one).
10. **Verify Clap:** Watch the console logs. The script should log when it spots the user, sets the timer, and finally replaces the message content. Verify the message text actually changes on the page after the delay.

---

That's the playbook, G. Test small, test big, keep it clean. Any questions, you know who to ask. Now go build that empire! V1LLAIN CLAP-BACK GANG WORLDWIDE! 🌐💥