#!/usr/bin/env python3
"""
Local helper for the "Sync to WPI" button on
https://urbanintelligence.github.io/WPI_PersonalSite/

Run this on a Mac that already has public_html mounted (Finder -> Go ->
Connect to Server -> smb://users.wpi.edu/personalweb/public_html). It
listens on http://localhost:8787 and, when you click "Sync to WPI" on the
editor page, runs sync-to-wpi.sh and reports back what happened.

It never touches your WPI password. It doesn't mount anything itself --
it just shells out to sync-to-wpi.sh, which relies entirely on the drive
you already mounted in Finder.

This only works while:
  - this script is running (leave the terminal window open), and
  - you're browsing the editor from this same Mac (or the same local
    network reaching it) -- it can't be reached from elsewhere on the
    internet, e.g. your iPhone away from home.

Usage:
    cd /Users/yli15/Documents/ClaudeCode/WPI_Personal_Website
    python3 sync-server.py

Press Ctrl+C to stop it.
"""
import http.server
import json
import os
import subprocess

PORT = 8787
ALLOWED_ORIGIN = 'https://urbanintelligence.github.io'
REPO_DIR = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self._cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/ping':
            self._send_json(200, {'ok': True, 'output': 'Sync helper is running.'})
            return
        self._send_json(404, {'ok': False, 'output': 'Unknown endpoint.'})

    def do_POST(self):
        if self.path != '/sync':
            self._send_json(404, {'ok': False, 'output': 'Unknown endpoint.'})
            return
        try:
            result = subprocess.run(
                ['bash', 'sync-to-wpi.sh'],
                cwd=REPO_DIR,
                capture_output=True,
                text=True,
                timeout=120,
            )
            output = (result.stdout or '') + (result.stderr or '')
            self._send_json(200, {'ok': result.returncode == 0, 'output': output.strip()})
        except subprocess.TimeoutExpired:
            self._send_json(200, {'ok': False, 'output': 'sync-to-wpi.sh took too long and was stopped. Check that public_html is still mounted and responsive.'})
        except Exception as e:
            self._send_json(200, {'ok': False, 'output': 'Could not run sync-to-wpi.sh: ' + str(e)})

    def log_message(self, fmt, *args):
        print('[sync-server]', fmt % args)


if __name__ == '__main__':
    print(f'Sync helper listening on http://localhost:{PORT}')
    print(f'Repo directory: {REPO_DIR}')
    print('Leave this running, then click "Sync to WPI" on the editor page.')
    print('Press Ctrl+C to stop.')
    server = http.server.HTTPServer(('localhost', PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
