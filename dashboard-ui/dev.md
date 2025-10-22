**Project:** Chat Clapper - Configuration UI
**Document:** Development Plan & Requirements
**Date:** Saturday, May 3, 2025

**1. Goal / Purpose**

To build a local, browser-based UI (`index.html` run via `file:///`) that lets a user easily manage all the settings for the Chat Clapper Tampermonkey userscript. This UI will read existing settings from `GM_getValue` and save changes back using `GM_setValue`.

**2. Target User**

Anyone who wants a custom blocking solution for web chat interfaces. Designed to be simple enough to guide non-techie homies through the initial setup steps if the main script ain't detected.

**3. Tech Stack**

* **Framework/Tooling:** Vite
* **UI Library:** React
* **Language:** TypeScript
* **Styling:** Tailwind CSS (CDN)

**4. Core Features & Requirements**

* **Conditional View (The Two Faces):**
    * **Detection:** On load, check if `GM_getValue` / `GM_setValue` are available (means the script is installed and matched correctly for this `file:///` page). Use `configService.checkGmReady()`.
    * **Setup Instructions View:** If `GM_*` functions *ain't* detected, show a clear, step-by-step guide telling the user:
        1.  How to install the `chat-clapper.user.js` file.
        2.  How to copy the current `file:///` path (display it clearly) and add it as a `@match` rule in the script's settings within Tampermonkey.
        3.  Include a "Reload Page" button.
    * **Configuration View:** If `GM_*` functions *are* detected, show the main UI for managing settings.
* **Configuration View Requirements:**
    * **Load/Save:**
        * On initial load (when `GM_*` ready), fetch the entire config object using `configService.loadConfig()`.
        * Provide clear "Save" buttons (e.g., one for Global, one per Site) that trigger `configService.saveConfig()` with the updated config object.
    * **Global Settings:**
        * Input field for "Replacement Message Text".
        * Number input field for "Clap Delay (Seconds)".
        * "Save Global Settings" button.
    * **Site Configurations:**
        * Ability to "Add New Site" configuration.
        * Tabs or a list to select which site's config is being edited.
        * **Per-Site Editor (shown one at a time):**
            * Input for "Site Label" (optional, nice name for the tab).
            * Input for "Site URL Match Pattern" (e.g., `https://*.somechat.com/*`).
            * Textarea or list input for "Usernames to Block" (one per line).
            * **HTML Analyzer Section:**
                * Textarea: "Paste Sample Message HTML Here".
                * Button: "Analyze HTML".
                * Input: "Container Selector" (Requires manual input/verification).
                * Input: "Author Selector" (UI tries to guess this after analysis).
                * Input: "Content Selector" (UI tries to guess this after analysis).
            * Button: "Save Config for This Site".
            * Button: "Delete Config for This Site".
    * **HTML Analysis Logic:** Need JavaScript code (likely in `SiteEditor` or a util function) that takes the pasted HTML, uses `DOMParser`, and applies some smarts (heuristics) to *suggest* CSS selectors for the Author and Content fields. User must be able to override suggestions.
    * **Data Structure:** All saved/loaded data must follow the specific JSON object structure we defined previously (with `global` and `sites` keys, where `sites` contains objects keyed by URL pattern holding `users` array and `selectors` object).

**5. Component Ideas (How to Chop it Up)**

* `App.tsx`: Main entry point, handles the Setup vs. Config view logic.
* `SetupInstructions.tsx`: Displays the step-by-step guide.
* `ConfigUI.tsx`: Wrapper for the actual config editing interface. Manages overall config state?
* `GlobalSettings.tsx`: Inputs and save button for global config.
* `SiteTabs.tsx`: Displays tabs/list for each site config, handles adding/selecting sites.
* `SiteEditor.tsx`: Form displaying all inputs for the *currently selected* site.
* `HtmlAnalyzer.tsx`: The sub-section within `SiteEditor` for pasting HTML, triggering analysis, and showing/editing selectors.

**6. Data Flow (How Info Moves)**

1.  `App.tsx` checks readiness with `configService.checkGmReady()`.
2.  If ready, `ConfigUI.tsx` calls `configService.loadConfig()` to get the state.
3.  State (the big config object) is likely held in `ConfigUI.tsx` or a shared context.
4.  State is passed down as props to child components (`GlobalSettings`, `SiteTabs`, `SiteEditor`).
5.  Changes in child components are signaled back up via callback functions (props).
6.  When a "Save" button is hit, the top-level state holder calls `configService.saveConfig()` with the full, updated config object.

**7. Build Setup**

* Configure `vite.config.ts` with `base: './'` and the `vite-plugin-singlefile` plugin to ensure the `npm run build` output (`dist/index.html`) is a self-contained file suitable for `file:///` usage.

**8. Dev Workflow**

* Use `npm run dev` for hot-reloading and easy UI development. Test UI logic using the `localStorage` fallback in `configService.ts`.
* For *real* testing of saving/loading via `GM_*` and interaction with the script: Build the UI (`npm run build`), install the script in Tampermonkey, edit the script's `@match` to include the `file:///` path to the built `dist/index.html`, and open that file locally.
