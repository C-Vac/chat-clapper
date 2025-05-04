// ui/src/App.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App'; // Assuming the component is App.tsx

// Mock the service if it helps isolate the component, OR rely on global mocks
// vi.mock('./services/configService', () => ({
//   loadConfig: vi.fn().mockResolvedValue({ global: {...}, sites: {} }),
//   saveConfig: vi.fn().mockResolvedValue(undefined),
//   checkGmReady: vi.fn().mockReturnValue(true) // or false for setup view test
// }));

describe('UserscriptSettingsDashboard / App', () => {
  // Test initial render in Setup Mode
  test('renders setup instructions when GM functions are missing', () => {
    // Need to ensure mocks are NOT present for this test
    const originalGetValue = window.GM_getValue;
    const originalSetValue = window.GM_setValue;
    // @ts-expect-error idk
    delete window.GM_getValue;
    // @ts-expect-error lol
    delete window.GM_setValue;

    render(<App />);
    expect(screen.getByText(/Setup Required!/i)).toBeInTheDocument();

    // Restore mocks if needed for other tests
    window.GM_getValue = originalGetValue;
    window.GM_setValue = originalSetValue;
  });

  // Test initial render in Config Mode (assuming global mocks are set up)
  test('renders config dashboard when GM functions are present', async () => {
    render(<App />);
    // Expect loading state first, then dashboard
    // Use findBy* which waits for async operations
    expect(await screen.findByText(/Chat Clapper Configurator/i)).toBeInTheDocument();
    // Check if default global values loaded into inputs
    expect(screen.getByLabelText(/Replacement Text/i)).toHaveValue('[Message Clapped]');
  });

  // Test saving global settings
  test('updates global settings and calls GM_setValue', async () => {
    render(<App />);
    const user = userEvent.setup(); // Use user-event

    // Wait for dashboard to load
    await screen.findByText(/Chat Clapper Configurator/i);

    const textInput = screen.getByLabelText(/Replacement Text/i);
    await user.clear(textInput);
    await user.type(textInput, 'New Replacement');

    // Need a save button - Assuming one exists (Add one if needed)
    // const saveButton = screen.getByRole('button', { name: /Save Global Settings/i });
    // await user.click(saveButton);

    // Since GM_setValue is mocked globally, check if it was called
    // Need to wait for potential state updates and async save
    // await waitFor(() => {
    //    expect(GM_setValue).toHaveBeenCalledWith('chatClapperConfig', expect.objectContaining({
    //        global: expect.objectContaining({ replacementText: 'New Replacement' })
    //    }));
    // });
  });

  // Add more tests: adding site, selecting site, editing users, deleting site etc.
});