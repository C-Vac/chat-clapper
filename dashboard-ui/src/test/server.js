// server.js
import { createServer } from 'http';
import { readFile, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const PORT = 42069; // You can change this port if needed
const PUBLIC_DIR = '/mnt/wsl/DebianProjectsVHD/workspace/webapps/chat-clapper/ui/src/test/public';

const generateRandomTrashHTML = () => {
    const tags = ['div', 'p', 'span', 'ul', 'li', 'h3', 'h4', 'section', 'article', 'aside'];
    const classNames = ['widget', 'promo', 'sidebar-item', 'footer-link', 'header-ad', 'content-noise'];
    const texts = [
        'Lorem ipsum dolor sit amet.', 'Consectetur adipiscing elit.', 'Sed do eiusmod tempor.',
        'Incididunt ut labore et dolore.', 'Magna aliqua.', 'Ut enim ad minim veniam.',
        'Quis nostrud exercitation ullamco.', 'Laboris nisi ut aliquip ex ea commodo consequat.',
        'Duis aute irure dolor in reprehenderit.', 'Excepteur sint occaecat cupidatat non proident.'
    ];

    let trash = '';
    const numTrashElements = 20 + Math.floor(Math.random() * 30); // 20-50 trash elements

    for (let i = 0; i < numTrashElements; i++) {
        const tag = tags[Math.floor(Math.random() * tags.length)];
        const className = classNames[Math.floor(Math.random() * classNames.length)];
        const textContent = texts[Math.floor(Math.random() * texts.length)];
        const depth = Math.floor(Math.random() * 3); // Nesting depth

        let element = `<${tag} class="${className}" data-test-ignore="true">`;
        if (Math.random() > 0.3 && tag !== 'ul' && tag !== 'li') { // Don't put text in ul directly
            element += textContent;
        }

        if (tag === 'ul') {
            const numLi = 2 + Math.floor(Math.random() * 3);
            for (let j = 0; j < numLi; j++) {
                element += `<li data-test-ignore="true">${texts[Math.floor(Math.random() * texts.length)]}</li>`;
            }
        }
        // Simple nesting for variety
        if (depth > 0 && tag !== 'li') { // Avoid nesting inside li for this simple generator
            let nestedTag = tags[Math.floor(Math.random() * tags.length)];
            while (nestedTag === 'ul' || nestedTag === 'li') nestedTag = tags[Math.floor(Math.random() * tags.length)]; // Avoid complex list nesting
            element += `<${nestedTag} data-test-ignore="true">${texts[Math.floor(Math.random() * texts.length)]}</${nestedTag}>`;
        }

        element += `</${tag}>`;
        trash += element;
    }
    return trash;
};

const server = createServer((req, res) => {
    console.log(`Request for ${req.url}`);

    if (req.url === '/') {
        const trashHeader = generateRandomTrashHTML();
        const trashSidebar = generateRandomTrashHTML();
        const trashFooter = generateRandomTrashHTML();

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Simulation for Parser Test</title>
    <style>
        body { font-family: sans-serif; margin: 0; padding: 20px; background-color: #f0f0f0; display: flex; flex-direction: column; align-items: center;}
        .main-container { display: flex; width: 90%; max-width: 1200px; background-color: #fff; padding: 15px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .content-area { flex-grow: 1; padding: 10px; }
        .sidebar { width: 250px; padding: 10px; background-color: #f9f9f9; margin-left: 20px; }
        #chat-app-wrapper { border: 2px solid #007bff; padding: 15px; background-color: #e9ecef; border-radius: 8px; margin-bottom: 20px;}
        #chat-container {
            height: 400px;
            overflow-y: auto;
            border: 1px solid #ccc;
            padding: 10px;
            background-color: #fff;
            margin-bottom: 10px;
            display: flex;
            flex-direction: column-reverse; /* Newest messages at the bottom, visually */
        }
        .chat-message { /* This is what we want to identify */
            margin-bottom: 8px;
            padding: 8px;
            border-radius: 4px;
            background-color: #f1f1f1;
            border: 1px solid #ddd;
            display: flex; /* For author and text alignment */
            flex-direction: column; /* Stack author above text if desired, or row */
        }
        .message-author { /* Target this for author */
            font-weight: bold;
            color: #333;
            margin-right: 5px; /* If in row with text */
             margin-bottom: 4px; /* If in column */
        }
        .message-text { /* Target this for text */
            color: #555;
        }
        .trash-section { padding: 15px; margin: 10px 0; background-color: #fffacd; border: 1px dashed #ccc; opacity: 0.7; }
        .trash-section [data-test-ignore="true"] { border: 1px dotted #ffcccb; padding: 2px; margin: 1px; }
    </style>
</head>
<body>
    <header class="trash-section header-trash" data-test-ignore="true">
        <h1 data-test-ignore="true">My Awesome Page</h1>
        ${trashHeader}
    </header>

    <div class="main-container">
        <div class="content-area">
            <div id="chat-app-wrapper">
                <h2 id="chat-title">Live Chat Room</h2>
                <div id="chat-container-scroll-parent">  <div id="chat-container">
                        </div>
                </div>
                <div class="chat-input-area" data-test-ignore="true">
                    <input type="text" placeholder="Type a message (non-functional)" data-test-ignore="true" style="width: 80%; padding: 8px;">
                    <button data-test-ignore="true">Send</button>
                </div>
            </div>
            <div class="trash-section below-chat-trash">
                ${generateRandomTrashHTML()}
            </div>
        </div>
        <aside class="sidebar trash-section sidebar-trash">
            <h3 data-test-ignore="true">Sidebar Noise</h3>
            ${trashSidebar}
        </aside>
    </div>

    <footer class="trash-section footer-trash" data-test-ignore="true">
        <p data-test-ignore="true">&copy; 2025 Not a Real Company</p>
        ${trashFooter}
    </footer>

    <script src="client.js"></script>
</body>
</html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
    } else if (req.url === '/client.js') {
        const clientScriptPath = join(PUBLIC_DIR, 'client.js');
        readFile(clientScriptPath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('client.js not found');
                console.error('Could not find client.js:', err);
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(data);
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Public directory (for client.js): ${PUBLIC_DIR}`);
    // Create public directory if it doesn't exist
    if (!existsSync(PUBLIC_DIR)) {
        mkdirSync(PUBLIC_DIR, { recursive: true });
    }
    // Check if client.js exists, if not, create a placeholder
    const clientScriptPath = join(PUBLIC_DIR, 'client.js');
    if (!existsSync(clientScriptPath)) {
        writeFileSync(clientScriptPath, '// Placeholder for client.js - populate with chat simulation logic\nconsole.log("Placeholder client.js loaded");', 'utf8');
        console.log(`Placeholder client.js created at ${clientScriptPath}. Please populate it.`);
    }
});