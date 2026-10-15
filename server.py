#!/usr/bin/env python3
"""
Stickman Fight - Localhost Web Server
Automatically binds to an open port (default 8000) and launches the browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

# Force UTF-8 encoding on standard output for Windows console compatibility
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = 8000
MAX_ATTEMPTS = 10

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable caching-free development headers
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    # Ensure working directory is the script folder
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)

    port = PORT
    httpd = None

    for attempt in range(MAX_ATTEMPTS):
        try:
            httpd = socketserver.TCPServer(("", port), CustomHTTPRequestHandler)
            break
        except OSError:
            print(f"Port {port} is busy, trying port {port + 1}...")
            port += 1

    if not httpd:
        print("Could not find an available port to start the server.")
        sys.exit(1)

    url = f"http://localhost:{port}/"
    print("=" * 60)
    print(" [STICKMAN FIGHT] - ARCADE BRAWL LOCALHOST SERVER")
    print("=" * 60)
    print(f" Localhost Server running at: {url}")
    print(" Press Ctrl+C in terminal to stop the server.")
    print("=" * 60)

    # Automatically launch user's browser
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Note: Could not automatically open browser ({e}). Please visit {url} directly.")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server... Thanks for playing!")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
