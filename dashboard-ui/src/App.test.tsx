import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import * as configService from './services/configService';

// (Keep the beforeEach and mock setup from the previous example)
beforeEach(() => {
  vi.clearAllMocks();
  // Reset window properties if needed
  window.chatClapper_isGmReady = true;
  window.chatClapper_GM_getValue = vi.fn(async (key, defaultValue) => { /* default mock impl */ });
  window.chatClapper_GM_setValue = vi.fn(async (key, value) => { /* default mock impl */ });
  // Mock loadConfig
  vi.spyOn(configService, 'loadConfig').mockResolvedValue({
    global: { replacementText: 'Test Clap', delaySeconds: 1 },
    sites: {},
  });
});


describe('App Component (with Regex Queries)', () => {
  it('should render config view (dashboard) when bridged functions are ready', async () => {
    // Arrange: window.chatClapper_isGmReady is true by default

    // Act
    render(<App />);

    // Assert: Use regex for case-insensitive match on the heading name.
    // Replace /dashboard/i if a different term is more stable/accurate for your config view.
    // Using findByRole for potentially async rendering
    const configHeading = await screen.findByRole('heading', {
      name: /dashboard/i // Case-insensitive regex for "dashboard"
    });
    expect(configHeading).toBeInTheDocument();

    // Verify loadConfig was called
    expect(configService.loadConfig).toHaveBeenCalled();
  });

  it('should render setup view (install instructions) when bridged functions are NOT ready', () => {
    // Arrange: Override the default mock
    window.chatClapper_isGmReady = false;
    window.chatClapper_GM_getValue = undefined;
    window.chatClapper_GM_setValue = undefined;
    vi.spyOn(configService, 'loadConfig').mockResolvedValue({} as any); // Prevent actual call

    // Act
    render(<App />);

    // Assert: Use regex for case-insensitive match on the heading name.
    // Replace /install/i if a different term is more accurate for your setup view.
    const setupHeading = screen.getByRole('heading', {
      name: /install/i // Case-insensitive regex for "install"
    });
    expect(setupHeading).toBeInTheDocument();

    // Verify loadConfig was *not* called
    expect(configService.loadConfig).not.toHaveBeenCalled();
  });
});