/**
 * Stickman Fight - Node.js Localhost HTTP Server
 * Zero npm dependencies required - pure Node.js standard library!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let PORT = 8000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

function createServer(port) {
    const server = http.createServer((req, res) => {
        let reqPath = req.url.split('?')[0];
        if (reqPath === '/') reqPath = '/index.html';

        const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(__dirname, safePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Server Error: ' + err.code);
                }
            } else {
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(content);
            }
        });
    });

    server.listen(port, () => {
        const url = `http://localhost:${port}/`;
        console.log('============================================================');
        console.log(' 💥 STICKMAN FIGHT - ARCADE BRAWL (NODE.JS SERVER) 💥');
        console.log('============================================================');
        console.log(` Server running at: ${url}`);
        console.log(' Press Ctrl+C in terminal to stop.');
        console.log('============================================================');

        // Automatically open browser on Windows
        const startCmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
        exec(`${startCmd} ${url}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} in use, trying ${port + 1}...`);
            createServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

createServer(PORT);
