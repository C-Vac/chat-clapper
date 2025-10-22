# Wow Vegas Chat Tweaks 🎤👏🏿

This project is a consolidated collection of Tampermonkey userscripts designed to enhance the chat experience on Wow Vegas and other sites. It includes scripts for message clapping, button clicking, and chat cheating, all managed through a unified configuration UI.

## 🏗️ Project Structure

The repository is organized into two main components: the userscripts and the configuration UI.

### wow-vegas-chat-tweaks/
The main project directory containing all userscripts and tests.

- **Scripts:**
  - `wow-vegas-chat-tweaks.user.js`: Main script (currently empty, to be updated).
  - `chat-clapper.user.js`: Claps (replaces) messages from specified users on configured sites.
  - `chat-cheater.user.js`: Assists in chat-based games by scraping metadata.
  - `button-clicker.user.js`: Automatically clicks specified buttons.

- **Tests:**
  - `test/`: Test files, mocks, and fixtures for all scripts.
    - `config.test.js`: Tests for configuration service.
    - `observer.test.js`: Tests for observer functionality.
    - `e2e.spec.js`: End-to-end tests using Playwright.
    - `server.js`: Test server for e2e tests.
    - `fixtures/`: HTML fixtures for testing.
    - `mocks/setup.js`: Test mocks for GM functions and IndexedDB.

- **Configuration:**
  - `package.json`: Dependencies and scripts for testing and linting.
  - `vitest.config.js`: Vitest configuration for tests.

### dashboard-ui/
The configuration UI for managing script settings.

- **Source:**
  - `src/`: React application code.
    - `App.tsx`: Main component.
    - `services/configService.ts`: Handles config loading/saving via GM functions.

- **Build:**
  - `dist/`: Built static files (after `npm run build`).

## 🛠️ Development Setup & Workflow

Get your tools ready: Node.js (latest LTS), npm/yarn/pnpm, and a browser with Tampermonkey.

### 1. Developing the Scripts (`./wow-vegas-chat-tweaks`)

- `cd wow-vegas-chat-tweaks`
- `npm install`
- `npm run test`: Run unit tests.
- `npm run test:e2e`: Run e2e tests.
- Edit the .user.js files as needed.

### 2. Developing the Configuration UI (`./dashboard-ui`)

- `cd dashboard-ui`
- `npm install`
- `npm run dev`: Start dev server.
- `npm run build`: Build for production.

### 3. Integration

- Install the desired .user.js script in Tampermonkey.
- Build the dashboard-ui and open the dist/index.html with a file:// URL.
- Ensure the script's @match includes the dashboard path.

---

That's the playbook, G. Test small, test big, keep it clean. Now go build that empire! 🌐💥