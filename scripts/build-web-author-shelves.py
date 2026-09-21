#!/usr/bin/env python3
"""Build UI shelf fallbacks from downloaded public catalogue and graph JSON.
Usage: python3 scripts/build-web-author-shelves.py CATALOGUE GRAPH OUTPUT
Existing graph/room assignments take precedence at runtime. No corpus is edited.
"""
import collections
import datetime
import json
from pathlib import Path
import re
import sys
import unicodedata

SHELVES = {'Latin Fathers':'pl','Greek Fathers':'gf','Eastern Fathers':'po',
           'English Divines':'ed','Medieval':'md','Roman Catholic':'rc',
           'Reformed':'rf','Continental Reformed':'rf','Lutheran':'lu',
           'Humanism and Law':'hl'}

def words(value):
    text = unicodedata.normalize('NFD', value).encode('ascii', 'ignore').decode().lower()
    return re.findall('[a-z0-9]+', text)

def build(catalogue, graph):
    exact = collections.defaultdict(list)
    reordered = collections.defaultdict(list)
    for work in catalogue['works']:
        if work.get('tradition') not in SHELVES:
            continue
        parts = words(work.get('author', ''))
        if not parts:
            continue
        exact[''.join(parts)].append(work)
        reordered[tuple(sorted(parts))].append(work)
    result = {}
    for node in graph['nodes']:
        parts = words(node['a'])
        hits = exact.get(''.join(parts))
        method = 'exact-name'
        if not hits:
            hits = reordered.get(tuple(sorted(parts)))
            method = 'same-name-words'
        if not hits:
            continue
        counts = collections.Counter(SHELVES[w['tradition']] for w in hits).most_common()
        if len(counts) > 1 and counts[0][1] == counts[1][1]:
            continue  # An ambiguous tie stays unclassified.
        result[node['s']] = {'sh': counts[0][0], 'works': counts[0][1], 'match': method}
    return {'source': '/v1/works-index.json', 'verified': str(datetime.date.today()), 'authors': result}

if __name__ == '__main__':
    catalogue, graph, output = map(Path, sys.argv[1:])
    payload = build(json.loads(catalogue.read_text()), json.loads(graph.read_text()))
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f"{len(payload['authors'])} catalogue-backed shelf fallbacks")
