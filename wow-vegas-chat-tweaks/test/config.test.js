import { describe, it, expect, vi, beforeEach } from 'vitest';
// Assuming ConfigService is exported or accessible
import { ConfigService } from '../chat-clapper.user.js';

describe('ConfigService', () => {
    let mockGmGetValue;

    beforeEach(() => {
        mockGmGetValue = vi.fn();
        ConfigService.config = null; // Reset internal cache
    });

    describe('loadConfig', () => {
        it('should load and parse valid JSON config', async () => {
            const fakeConfig = { global: { delaySeconds: 5 }, sites: {} };
            mockGmGetValue.mockResolvedValue(JSON.stringify(fakeConfig));

            const loadedConfig = await ConfigService.loadConfig(mockGmGetValue);

            expect(mockGmGetValue).toHaveBeenCalledWith('chatClapperConfig', '{}');
            expect(loadedConfig).toEqual(fakeConfig);
            expect(ConfigService.config).toEqual(fakeConfig); // Check internal cache
        });

        it('should return empty object and throw on invalid JSON', async () => {
            mockGmGetValue.mockResolvedValue('{invalid json');
            await expect(ConfigService.loadConfig(mockGmGetValue)).rejects.toThrow();
            expect(ConfigService.config).toEqual({}); // Should reset to empty on error
        });

        it('should throw if GM_getValue is not a function', async () => {
            await expect(ConfigService.loadConfig(undefined)).rejects.toThrow("GM_getValue is not available");
        });
    });

    describe('findSiteConfig', () => {
        beforeEach(() => {
            // Set a base config for these tests
            ConfigService.config = {
                global: { replacementText: 'Global Clap' },
                sites: {
                    'https://example.com/chat': { users: ['user1'] },
                    'https://*.example.org/*': { users: ['user2'] },
                    'http://localhost:1234/': { users: ['dev'] },
                },
            };
        });

        it('should find exact match', () => {
            const url = 'https://example.com/chat';
            const result = ConfigService.findSiteConfig(url);
            expect(result.siteKey).toBe('https://example.com/chat');
            expect(result.siteConfig).toEqual({ users: ['user1'] });
            expect(result.globalConfig).toEqual({ replacementText: 'Global Clap' });
        });

        it('should find wildcard match', () => {
            const url = 'https://sub.example.org/some/path';
            const result = ConfigService.findSiteConfig(url);
            expect(result.siteKey).toBe('https://*.example.org/*');
            expect(result.siteConfig).toEqual({ users: ['user2'] });
        });

        it('should handle localhost match', () => {
            const url = 'http://localhost:1234/';
            const result = ConfigService.findSiteConfig(url);
            expect(result.siteKey).toBe('http://localhost:1234/');
            expect(result.siteConfig).toEqual({ users: ['dev'] });
        });

        it('should return null siteKey/siteConfig if no match', () => {
            const url = 'https://unknown.com';
            const result = ConfigService.findSiteConfig(url);
            expect(result.siteKey).toBeNull();
            expect(result.siteConfig).toBeNull();
            expect(result.globalConfig).toEqual({ replacementText: 'Global Clap' });
        });

        it('should handle missing sites config', () => {
            ConfigService.config = { global: {} }; // No sites key
            const url = 'https://example.com/chat';
            const result = ConfigService.findSiteConfig(url);
            expect(result.siteKey).toBeNull();
            expect(result.siteConfig).toBeNull();
        });
    });

    describe('getValidatedConfig', () => {
        const siteKey = 'test.com';
        const siteConfig = {
            users: [' UserA ', 'userB', null, '', ' userc '],
            selectors: { container: '.chat', author: '.author', content: '.msg' }
        };
        const globalConfig = { replacementText: 'Poof', delaySeconds: 5 };

        it('should validate and return structured config', () => {
            const validated = ConfigService.getValidatedConfig(siteKey, siteConfig, globalConfig);
            expect(validated).toEqual({
                replacementText: 'Poof',
                delaySeconds: 5,
                usersToBlock: ['usera', 'userb', 'userc'], // Lowercase, trimmed, non-empty
                selectors: { containerSelector: '.chat', authorSelector: '.author', contentSelector: '.msg' },
                siteKey: 'test.com'
            });
        });

        it('should use default global values if not provided', () => {
            const validated = ConfigService.getValidatedConfig(siteKey, siteConfig, {}); // Empty global
            expect(validated.replacementText).toBe('[Message Clapped]');
            expect(validated.delaySeconds).toBe(3);
        });

        it('should return null if essential selectors are missing', () => {
            const badConfig = { ...siteConfig, selectors: { container: '.chat', author: '.author' } }; // Missing content
            const validated = ConfigService.getValidatedConfig(siteKey, badConfig, globalConfig);
            expect(validated).toBeNull();
        });

        it('should handle empty/missing users array', () => {
            const noUsersConfig = { ...siteConfig, users: [] };
            const validated = ConfigService.getValidatedConfig(siteKey, noUsersConfig, globalConfig);
            expect(validated.usersToBlock).toEqual([]); // Should still validate but log a warning (in real run)
        });

        it('should return null if siteConfig is null', () => {
            const validated = ConfigService.getValidatedConfig(siteKey, null, globalConfig);
            expect(validated).toBeNull();
        });
    });
});