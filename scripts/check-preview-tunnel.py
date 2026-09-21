"""Preview boundary checks; no network requests to Ghost or Cloudflare."""
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('preview', Path(__file__).with_name('preview-tunnel.py'))
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class PreviewRoutes(unittest.TestCase):
    def test_admin_and_accounts_are_not_public(self):
        for path in ['/ghost/', '/admin/', '/members/api/member/',
                     '/%67host/api/admin/', '/x/../ghost/',
                     '/%252567host/', '/__data/library/../../../ghost/']:
            with self.subTest(path=path):
                self.assertIsNone(preview.route(path))

    def test_only_public_portal_configuration_is_allowed(self):
        self.assertEqual(preview.route('/members/api/site/?ignored=1'),
                         (preview.GHOST + '/members/api/site/', False))
        self.assertIsNone(preview.route('/members/api/site/../member'))
        for resource in ['settings', 'tiers', 'newsletters']:
            self.assertEqual(preview.route('/ghost/api/content/' + resource + '/?key=public'),
                             (preview.GHOST + '/ghost/api/content/' + resource + '/?key=public', False))
        self.assertIsNone(preview.route('/ghost/api/admin/settings/'))
        self.assertIsNone(preview.route('/ghost/api/content/members/'))

    def test_library_routes_and_query_are_preserved(self):
        self.assertEqual(preview.route('/the-faith-received/read/?w=didache&p=7'),
                         (preview.GHOST + '/the-faith-received/read/?w=didache&p=7', False))
        self.assertEqual(preview.route('/__data/library/v1/works/didache/meta.json'),
                         (preview.WORKERS['library'] + '/v1/works/didache/meta.json', True))
        self.assertIsNotNone(preview.route('/__data/notes/v1/index.json.gz'))

    def test_paid_or_mutating_worker_routes_are_not_proxied(self):
        for path in ['/__data/research/v1/ask', '/__data/research/v1/vsearch',
                     '/__data/research/v1/investigations/id', '/__data/library/v1/ask',
                     '/__data/unknown/v1/index.json']:
            self.assertIsNone(preview.route(path))
        self.assertIsNotNone(preview.route('/__data/research/v1/chapter/ESV/Romans/6'))
        self.assertIsNotNone(preview.route('/__data/research/v1/evidence?author=Augustine'))

    def test_host_header_cannot_supply_an_arbitrary_origin(self):
        self.assertEqual(preview.public_origin('preview-test.trycloudflare.com'),
                         'https://preview-test.trycloudflare.com')
        self.assertEqual(preview.public_origin('127.0.0.1:2370'), 'http://127.0.0.1:2370')
        for host in ['evil.example', 'x.trycloudflare.com.evil.example', 'x.trycloudflare.com@evil.example']:
            self.assertIsNone(preview.public_origin(host))

    def test_links_and_public_data_are_rewritten(self):
        origin = 'https://preview-test.trycloudflare.com'
        self.assertEqual(preview.rewrite('http://localhost:2368/the-faith-received/', origin),
                         origin + '/the-faith-received/')
        for key, upstream in preview.WORKERS.items():
            self.assertEqual(preview.rewrite(upstream + '/v1/index.json', origin),
                             origin + '/__data/' + key + '/v1/index.json')

    def test_withdrawn_volume_stays_out_of_public_preview(self):
        slug = 'westminster-assembly-minutes-vol-1'
        for path in ['/the-faith-received/read/?w=' + slug,
                     '/__data/library/v1/works/' + slug + '/meta.json',
                     '/__data/library/v1/tei/tfr/' + slug + '.xml']:
            self.assertIsNone(preview.route(path))
        source = json.dumps({'works': [{'slug': slug}, {'slug': 'didache'}]})
        filtered = preview.public_catalogue(source, preview.WORKERS['library'] + '/v1/works-index.json')
        self.assertEqual(json.loads(filtered)['works'], [{'slug': 'didache'}])


if __name__ == '__main__':
    unittest.main()
