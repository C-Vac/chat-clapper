# Chat Clapper - Script & Testing Lab 🔬

Yo, this `/script` directory is the engine room for the Chat Clapper userscript.

**Purpose:**

* Holds the source code for the main Tampermonkey script (`chat-clapper.user.js`).
* Contains the testing setup (Vitest, JSDOM) to verify the script's logic works *without* needing to constantly load it in a real browser with Tampermonkey. Test faster, build smarter, ya dig?

**Key Files:**

* `chat-clapper.user.js`: The real deal userscript you install in Tampermonkey.
* `package.json`: Lists the Node.js dev dependencies needed for testing (Vitest, JSDOM, TypeScript).
* `vitest.config.ts`: Configures the Vitest test runner to use the `jsdom` environment (fakes a browser DOM).
* `tests/`: All the testing shit lives here.
    * `fixtures/`: Sample data like `config.dev.json` (a fake config object) and `.txt` files with sample HTML snippets.
    * `mocks/`: Fake versions of browser/Tampermonkey stuff, like `gmAPI.mock.js` which pretends to be `GM_getValue` and `GM_setValue`, reading/writing to the `config.dev.json` fixture.
    * `*.test.ts`: The actual test files where you write checks using Vitest syntax.

**Setup:**

1.  Make sure you got Node.js and npm/yarn/pnpm installed.
2.  Navigate here: `cd script`
3.  Install dev dependencies: `npm install`

**Runnin' Tests:**

* **Run once:** `npm run test` (or `npx vitest run`)
* **Run in watch mode (reruns when files change):** `npx vitest watch`

These tests will run your script's logic against the mocked APIs and fixtures, makin' sure it behaves right in isolation.

**Keep in Mind:**

* Any changes you make to the logic intended for the *real* script need to be updated in the main `chat-clapper.user.js` file.
* This testing setup is great for logic, but final integration testing (see main README) in a real browser with Tampermonkey is still essential.

💯 Stay sharp, test yo' shit!