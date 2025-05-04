import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App'; // Assuming your main App component is in ./App.tsx
import * as configService from './services/configService';

// Mock the configService functions that App might call on render
vi.mock('./services/configService', () => ({
  checkGmReady: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({ // Provide mock initial config
    global: { replacementText: '[Mocked Clap]', delaySeconds: 2 },
    sites: {},
  }),
  // Mock other functions from configService if App uses them
}));

describe('App Component Baseline Test', () => {
  it('should render the configuration view when GM functions are ready', () => {
    // Arrange: Simulate GM functions being ready
    vi.mocked(configService.checkGmReady).mockReturnValue(true);

    // Act: Render the App component
    render(<App />);

    // Assert: Check for an element expected in the main config view
    // Replace 'Global Settings' with text or role specific to your config UI
    const expectedElement = screen.getByRole('heading', { name: /Global Settings/i });
    expect(expectedElement).toBeInTheDocument();

    // Verify loadConfig was called (optional, but good practice)
    expect(configService.loadConfig).toHaveBeenCalled();
  });

  it('should render the setup instructions view when GM functions are not ready', () => {
    // Arrange: Simulate GM functions being absent
    vi.mocked(configService.checkGmReady).mockReturnValue(false);

    // Act: Render the App component
    render(<App />);

    // Assert: Check for an element expected in the setup instructions view
    // Replace 'Install the Userscript' with text specific to your setup view
    const expectedElement = screen.getByRole('heading', { name: /Install the Userscript/i });
    expect(expectedElement).toBeInTheDocument();

    // Verify loadConfig was *not* called in this case (optional)
    expect(configService.loadConfig).not.toHaveBeenCalled();
  });
});