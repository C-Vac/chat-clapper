import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObserverService } from '../chat-clapper.user.js';

const mockDbService = {
    addBlockedMessage: vi.fn(),
};
const mockDomService = {
    getElementText: vi.fn(),
    replaceElementContent: vi.fn(),
    styleClappedElement: vi.fn(),
    dispatchEvent: vi.fn(),
};

// Mock MutationObserver
let mutationCallback = null;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
global.MutationObserver = vi.fn((callback) => {
    mutationCallback = callback; // Capture the callback
    return {
        observe: mockObserve,
        disconnect: mockDisconnect,
    };
});


describe('ObserverService', () => {
    const containerElement = document.createElement('div'); // Mock container
    const validatedConfig = {
        usersToBlock: ['goofyuser', 'testuser'],
        selectors: { authorSelector: '.author', contentSelector: '.content' },
        replacementText: '[CLAPPED]',
        delaySeconds: 0.1, // Use short delay for testing
        siteKey: 'test.com'
    };

    beforeEach(() => {
        vi.useFakeTimers();
        mutationCallback = null; // Reset callback
        vi.clearAllMocks(); // Clear service and observer mocks
        // Reset mock return values
        mockDbService.addBlockedMessage.mockResolvedValue(123); // Simulate DB success
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        ObserverService.disconnectObserver(); // Ensure observer is cleaned up
    });

    it('should create and start MutationObserver', () => {
        ObserverService.startObserver(containerElement, validatedConfig, mockDbService, mockDomService);
        expect(MutationObserver).toHaveBeenCalled();
        expect(mockObserve).toHaveBeenCalledWith(containerElement, { childList: true, subtree: true });
        expect(ObserverService.observer).toBeDefined();
    });

    it('should process added nodes and identify target users', () => {
        ObserverService.startObserver(containerElement, validatedConfig, mockDbService, mockDomService);

        const addedNode = document.createElement('div');
        const authorSpan = document.createElement('span');
        authorSpan.className = 'author';
        authorSpan.textContent = 'GoofyUser:'; // Test case sensitivity + colon removal
        addedNode.appendChild(authorSpan);
        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.textContent = 'Original message';
        addedNode.appendChild(contentSpan);

        // Mock DomService return value for this node
        mockDomService.getElementText.mockReturnValue('goofyuser');

        // Simulate mutation
        mutationCallback([{ addedNodes: [addedNode], type: 'childList' }]);

        // Check if timeout was set (due to user match)
        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100); // 0.1s * 1000
    });

    it('should not process nodes without an author element', () => {
        ObserverService.startObserver(containerElement, validatedConfig, mockDbService, mockDomService);
        const addedNode = document.createElement('div'); // No author inside
        addedNode.textContent = "some random text";
        mutationCallback([{ addedNodes: [addedNode], type: 'childList' }]);
        expect(setTimeout).not.toHaveBeenCalled();
    });

    it('should not set timeout for non-target users', () => {
        ObserverService.startObserver(containerElement, validatedConfig, mockDbService, mockDomService);
        const addedNode = document.createElement('div');
        const authorSpan = document.createElement('span');
        authorSpan.className = 'author';
        authorSpan.textContent = 'NiceUser';
        addedNode.appendChild(authorSpan);
        mockDomService.getElementText.mockReturnValue('niceuser'); // Mock return

        mutationCallback([{ addedNodes: [addedNode], type: 'childList' }]);
        expect(setTimeout).not.toHaveBeenCalled();
    });


    it('should replace content, style, store, and dispatch event after delay', async () => {
        ObserverService.startObserver(containerElement, validatedConfig, mockDbService, mockDomService);

        const addedNode = document.createElement('div');
        const authorSpan = document.createElement('span');
        authorSpan.className = 'author';
        authorSpan.textContent = 'TestUser:';
        addedNode.appendChild(authorSpan);
        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.textContent = 'Hello there!';
        addedNode.appendChild(contentSpan);

        mockDomService.getElementText.mockReturnValue('testuser'); // Matched user

        // Simulate mutation
        mutationCallback([{ addedNodes: [addedNode], type: 'childList' }]);

        // Should have set timeout
        expect(setTimeout).toHaveBeenCalledTimes(1);

        // --- Fast-forward time ---
        // Need to capture original content *before* replace is called by mock
        mockDomService.replaceElementContent.mockImplementation(() => {
            return 'Hello there!'; // Simulate returning original content
        });
        vi.advanceTimersByTime(150); // Advance past the 100ms delay

        // --- Assertions after timeout ---
        // Wait for async operations inside timeout (like addBlockedMessage)
        await vi.waitFor(() => {
            expect(mockDomService.replaceElementContent).toHaveBeenCalledWith(addedNode, '.content', '[CLAPPED]');
        });
        expect(mockDomService.styleClappedElement).toHaveBeenCalledWith(addedNode);
        expect(mockDbService.addBlockedMessage).toHaveBeenCalledWith({
            author: 'testuser',
            originalContent: 'Hello there!', // Captured before replace
            clappedContent: '[CLAPPED]',
            site: 'test.com',
        });
        // Check event dispatch
        expect(mockDomService.dispatchEvent).toHaveBeenCalledWith(
            'chatClapperMessageBlocked',
            expect.objectContaining({ // Check details
                author: 'testuser',
                originalContent: 'Hello there!',
                clappedContent: '[CLAPPED]',
                site: 'test.com',
                id: 123, // From mock DB return
                timestamp: expect.any(Number) // Check timestamp exists
            })
        );
    });

    it('should handle content element disappearing before timeout', () => {
        ObserverService.startObserver(containerElement, validatedConfig, mockDbService, mockDomService);
        const addedNode = document.createElement('div');
        const authorSpan = document.createElement('span');
        authorSpan.className = 'author';
        authorSpan.textContent = 'TestUser:';
        addedNode.appendChild(authorSpan);
        // Content exists initially
        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.textContent = 'Will disappear';
        addedNode.appendChild(contentSpan);

        mockDomService.getElementText.mockReturnValue('testuser');
        mutationCallback([{ addedNodes: [addedNode], type: 'childList' }]);
        expect(setTimeout).toHaveBeenCalledTimes(1);

        // Simulate content removal before timeout fires
        addedNode.removeChild(contentSpan);

        // Fast-forward time
        vi.advanceTimersByTime(150);

        // Assertions: Should NOT have called replace, style, db, dispatch
        expect(mockDomService.replaceElementContent).not.toHaveBeenCalled();
        expect(mockDomService.styleClappedElement).not.toHaveBeenCalled();
        expect(mockDbService.addBlockedMessage).not.toHaveBeenCalled();
        expect(mockDomService.dispatchEvent).not.toHaveBeenCalled();
        // Should ideally log a warning (check console spy if implemented)
    });

    it('should disconnect observer', () => {
        ObserverService.startObserver(containerElement, validatedConfig, mockDbService, mockDomService);
        expect(ObserverService.observer).toBeDefined();
        ObserverService.disconnectObserver();
        expect(mockDisconnect).toHaveBeenCalled();
        expect(ObserverService.observer).toBeNull();
    });
});