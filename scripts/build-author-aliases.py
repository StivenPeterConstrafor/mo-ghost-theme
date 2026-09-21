"""Reconcile public catalogue author labels by work ID; retain ambiguous people.
Usage: python3 scripts/build-author-aliases.py WORKS_INDEX EEBO_CATALOGUE
Inputs are downloaded public catalogues, never corpus source files.
"""
import collections
import json
import re
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
works = json.loads(Path(sys.argv[1]).read_text())['works']
raw = json.loads(Path(sys.argv[2]).read_text())
held = set(map(str, json.loads((root/'assets/data/faith-received/eebo-held.json').read_text())['ids']))
canonical = {w['slug'][5:]: w['author'] for w in works if w['slug'].startswith('eebo-')}
bios = json.loads((root/'assets/data/faith-received/tfr-authors.json').read_text())
groups = collections.defaultdict(dict)
def qualifier(label):
    # The third catalogue field ends at the date, before any appended title.
    value = ', '.join(label.split(',')[2:]).strip(' ()')
    value = re.split(r'\. (?=[A-Z])', value)[0]
    return value.replace('-', '–').strip(' .()')
def years(value):
    return re.findall(r'\d{4}', value)
for w in raw:
    if w['i'] in held and w['i'] in canonical:
        name = canonical[w['i']]
        if w['a'] != name: groups[name][w['a']] = qualifier(w['a'])
aliases = {}
for name, labels in sorted(groups.items()):
    dates = {tuple(years(q)) for q in labels.values() if years(q)}
    primary = tuple(years(bios.get(name, {}).get('dates', '')))
    for label, q in sorted(labels.items()):
        ys = tuple(years(q))
        # A named occupation or several distinct lifespans is not an alias.
        # A biography can identify the main author; other people retain dates.
        ambiguous = (len(dates) > 1 and ys != primary) or (q and not ys)
        aliases[label] = f'{name} ({q})' if ambiguous else name
out = root/'assets/data/faith-received/english-author-aliases.json'
out.write_text(json.dumps({'version':1,'source':'Public works-index joined to the held EEBO catalogue by work ID; existing author biographies disambiguate dates.','aliases':aliases},ensure_ascii=False,indent=2)+'\n')
print(f'{len(aliases)} catalogue labels reconciled')
