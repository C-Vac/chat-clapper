// public/client.js
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) {
        console.error('Chat container not found!');
        return;
    }

    const users = ['Goblin96', 'notAbot', 'LilBroomstick', 'AgentSmith', 'Subtracterall'];
    const messageTemplates = [
        "yo",
        "Just checking in. This is message number {count} from me.",
        "My {count}th contribution to this fascinating discussion.",
        "Thinking about {topic}... this is my {count}th thought on the matter.",
        "The quick brown fox jumps over the lazy dog. My {count} message today.",
        "Is anyone else experiencing this lag? This is my {count} attempt to send this.",
        "I agree with the previous point. This is my message {count}!",
        "This is test message #{id}. User {user} reporting for duty. This is my {count}th message.",
    ];
    const topics = ['AI', 'the weather', 'Node.js servers', 'frontend frameworks', 'the meaning of life', 'cat videos'];

    const userMessageCounts = {};
    users.forEach(user => userMessageCounts[user] = 0);

    let globalMessageIdCounter = 0;

    function addMessage() {
        const user = users[Math.floor(Math.random() * users.length)];
        userMessageCounts[user]++;
        globalMessageIdCounter++;

        const topic = topics[Math.floor(Math.random() * topics.length)];
        let messageText = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

        messageText = messageText
            .replace('{count}', userMessageCounts[user])
            .replace('{topic}', topic)
            .replace('{id}', globalMessageIdCounter)
            .replace('{user}', user);


        // --- Create the DOM structure for the message ---
        // This structure is what your selector inference should target
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'chat-message'; // A clear class for the message group

        const authorSpan = document.createElement('span');
        authorSpan.className = 'message-author'; // A clear class for the author
        authorSpan.textContent = `${user}:`;

        const textSpan = document.createElement('span');
        textSpan.className = 'message-text'; // A clear class for the message content
        textSpan.textContent = messageText;

        // Add an ID to the message wrapper for potential direct targeting/testing
        messageWrapper.id = `msg-${globalMessageIdCounter}`;

        messageWrapper.appendChild(authorSpan);
        messageWrapper.appendChild(textSpan);
        // --- End DOM structure ---

        // Prepend to keep newest messages at the top if chat-container is not flex-direction: column-reverse
        // If using column-reverse, append to have newest at bottom visually but top in DOM for scroll
        chatContainer.prepend(messageWrapper); // With column-reverse, prepend visually adds to bottom

        // Optional: Limit number of messages displayed to avoid performance issues
        const maxMessages = 100;
        if (chatContainer.children.length > maxMessages) {
            chatContainer.removeChild(chatContainer.lastChild);
        }
    }

    // Send a message every few seconds
    const minInterval = 2000; // 2 seconds
    const maxInterval = 5000; // 5 seconds
    function scheduleMessage() {
        addMessage();
        const interval = Math.random() * (maxInterval - minInterval) + minInterval;
        setTimeout(scheduleMessage, interval);
    }

    // Start sending messages
    scheduleMessage();
});