// test/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005; // Or choose another port

// Serve the fixture HTML files
app.get('/site1', (req, res) => {
    res.sendFile(path.join(__dirname, 'fixtures', 'chat-page-1.html'));
});

app.get('/site2', (req, res) => {
    res.sendFile(path.join(__dirname, 'fixtures', 'chat-page-2.html'));
});

// Default route or fallback
app.get('/', (req, res) => {
    res.send('Test server running. Visit /site1 or /site2');
});

let serverInstance = null;

export function startServer() {
    return new Promise((resolve) => {
        if (serverInstance) {
            resolve(serverInstance);
            return;
        }
        serverInstance = app.listen(PORT, () => {
            console.log(`[Test Server] Listening on http://localhost:${PORT}`);
            resolve(serverInstance);
        });
        serverInstance.on('error', (err) => {
            console.error("[Test Server] Error starting:", err);
            // Attempt to close if partially started
            if (serverInstance && serverInstance.listening) {
                serverInstance.close();
            }
            serverInstance = null;
            // Handle specific errors like EADDRINUSE
            if (err.code === 'EADDRINUSE') {
                console.error(`[Test Server] Port ${PORT} is already in use.`);
                // Optionally try another port or exit
            }
            process.exit(1); // Exit test process if server fails critically
        });
    });
}

export function stopServer() {
    return new Promise((resolve, reject) => {
        if (serverInstance && serverInstance.listening) {
            console.log("[Test Server] Stopping...");
            serverInstance.close((err) => {
                if (err) {
                    console.error("[Test Server] Error stopping:", err);
                    reject(err);
                } else {
                    console.log("[Test Server] Stopped.");
                    serverInstance = null;
                    resolve();
                }
            });
        } else {
            console.log("[Test Server] Already stopped or never started.");
            resolve(); // Nothing to stop
        }
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down server...');
    await stopServer();
    process.exit(0);
});