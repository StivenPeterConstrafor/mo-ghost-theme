#!/usr/bin/env python3
"""Read-only Ghost preview bridge for `cloudflared tunnel --url http://127.0.0.1:2370`.
No credentials are forwarded. Existing upstream authorization still applies.
"""
import argparse
import gzip
import json
import posixpath
import re
import ssl
import certifi
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

GHOST = 'http://127.0.0.1:2368'
WORKERS = {
    'library': 'https://mo-tfr-library.mo-podcast-feed.workers.dev',
    'notes': 'https://mo-tfr.mo-podcast-feed.workers.dev',
    'research': 'https://mo-tfr-ask-dev.mo-podcast-feed.workers.dev',
}
HOP = {'connection', 'transfer-encoding', 'content-length', 'content-encoding', 'set-cookie', 'access-control-allow-origin', 'access-control-allow-credentials'}
PUBLIC_FILE = re.compile(r'\.(?:json|xml|js|css|wasm|pf_meta|pf_index|pf_fragment|pf_filter|webp|jpg|jpeg|png|svg|avif|woff2?|pdf)(?:\.gz)?$', re.I)
WITHDRAWN = {'westminster-assembly-minutes-vol-1'}

def route(raw):
    parsed = urllib.parse.urlsplit(raw)
    decoded = parsed.path
    for _ in range(4):
        next_path = urllib.parse.unquote(decoded)
        if next_path == decoded:
            break
        decoded = next_path
    path = posixpath.normpath('/' + decoded.lstrip('/'))
    if any(slug in path or slug in urllib.parse.unquote(parsed.query) for slug in WITHDRAWN):
        return None
    # Portal reads this public site configuration even for signed-out visitors.
    if path == '/members/api/site':
        return GHOST + path + '/', False
    # Portal's signed-out display also reads these public Content API resources.
    # The key in its markup is the public Content API key, never an admin token.
    if path in {'/ghost/api/content/settings', '/ghost/api/content/tiers', '/ghost/api/content/newsletters'}:
        return GHOST + path + '/' + ('?' + parsed.query if parsed.query else ''), False
    if re.match(r'^/(?:ghost|admin|members)(?:/|$)', path):
        return None
    if path.startswith('/__data/'):
        bits = path.split('/', 3)
        if len(bits) < 4 or bits[2] not in WORKERS:
            return None
        resource = '/' + bits[3]
        if bits[2] == 'research':
            allowed = resource.startswith('/v1/chapter/ESV/') or resource == '/v1/evidence'
        else:
            allowed = bool(PUBLIC_FILE.search(resource))
        if not allowed:
            return None
        return WORKERS[bits[2]] + resource + ('?' + parsed.query if parsed.query else ''), True
    return GHOST + path + ('/' if parsed.path.endswith('/') and path != '/' else '') + ('?' + parsed.query if parsed.query else ''), False

def public_origin(host):
    if re.fullmatch(r'[a-z0-9-]+\.trycloudflare\.com', host or '', re.I):
        return 'https://' + host
    if re.fullmatch(r'(?:localhost|127\.0\.0\.1)(?::\d+)?', host or ''):
        return 'http://' + host
    return None

def rewrite(text, origin):
    for local in ['http://localhost:2368', 'http://127.0.0.1:2368']:
        text = text.replace(local, origin)
    for key, upstream in WORKERS.items():
        text = text.replace(upstream, origin + '/__data/' + key)
    return text

def public_catalogue(text, url):
    if urllib.parse.urlsplit(url).path not in {'/v1/works-index.json', '/v1/mo/index.json'}:
        return text
    data = json.loads(text)
    if isinstance(data, dict) and isinstance(data.get('works'), list):
        data['works'] = [w for w in data['works'] if str(w.get('slug') or w.get('id') or w.get('w') or '') not in WITHDRAWN]
    return json.dumps(data, ensure_ascii=False)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

OPENER = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=certifi.where())))

class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, fmt, *args):
        # Keep browsing queries and account data out of the proxy log.
        return
    def send(self, status, body, content_type='text/plain; charset=utf-8', headers=None):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        for key, value in (headers or {}).items():
            if key.lower() not in HOP | {'content-type', 'cache-control'}:
                self.send_header(key, value)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)
    def do_POST(self):
        self.close_connection = True
        self.send(403, b'{"error":"This tunnel is a read-only preview. Use localhost for sign-in and account actions."}', 'application/json')
    do_PUT = do_PATCH = do_DELETE = do_POST
    def do_HEAD(self):
        self.do_GET()
    def do_GET(self):
        origin = public_origin(self.headers.get('Host'))
        target = route(self.path)
        if not origin or target is None:
            self.send(404, b'Not available in this public preview.')
            return
        url, worker = target
        request_headers = {'Accept-Encoding': 'identity', 'User-Agent': 'TFR-local-preview/1.0'}
        if worker:
            # These public data endpoints already allow local theme preview.
            # No Cookie or Authorization header is forwarded or manufactured.
            request_headers['Origin'] = 'http://localhost:2368'
        else:
            request_headers['Host'] = 'localhost:2368'
        req = urllib.request.Request(url, headers=request_headers)
        try:
            try:
                response = OPENER.open(req, timeout=45)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                headers = dict(response.headers.items())
                ct = response.headers.get('Content-Type', 'application/octet-stream')
                packed_candidate = bool(re.search(r'\.(?:json|xml)\.gz(?:\?|$)', url))
                if not packed_candidate and not any(t in ct for t in ['text/', 'javascript', 'json', 'xml', 'svg']):
                    self.send_response(response.status)
                    self.send_header('Content-Type', ct)
                    self.send_header('Cache-Control', 'no-store')
                    self.send_header('Connection', 'close')
                    for key, value in headers.items():
                        if key.lower() not in (HOP - {'content-encoding'}) | {'content-type', 'cache-control'}:
                            self.send_header(key, value)
                    self.end_headers()
                    self.close_connection = True
                    if self.command != 'HEAD':
                        while chunk := response.read(65536):
                            self.wfile.write(chunk)
                    return
                body = response.read()
                if response.headers.get('Content-Encoding') == 'gzip':
                    body = gzip.decompress(body)
                packed_text = body.startswith(b'\x1f\x8b') and bool(re.search(r'\.(?:json|xml)\.gz(?:\?|$)', url))
                if packed_text:
                    body = gzip.decompress(body)
                textual = packed_text or any(t in ct for t in ['text/', 'javascript', 'json', 'xml', 'svg']) and not body.startswith(b'\x1f\x8b')
                if textual:
                    text = public_catalogue(body.decode('utf-8'), url) if worker else body.decode('utf-8')
                    body = rewrite(text, origin).encode('utf-8')
                if packed_text:
                    body = gzip.compress(body)
                for key in list(headers):
                    if key.lower() in {'location', 'content-security-policy', 'link'}:
                        # 'self' permits the proxied data paths in the existing CSP.
                        headers[key] = rewrite(headers[key], origin)
                self.send(response.status, body, ct, headers)
        except (OSError, ValueError, UnicodeError):
            self.send(502, b'Preview upstream unavailable. Please retry.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=2370)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print('Preview bridge listening on 127.0.0.1:' + str(args.port), flush=True)
    server.serve_forever()
