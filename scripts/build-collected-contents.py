#!/usr/bin/env python3
"""Build a compact UI index from the published collected-volume outlines.
Usage: build-collected-contents.py CATALOGUE METADATA_DIRECTORY OUTPUT
Does not edit catalogue titles, reader text, or corpus metadata.
"""
from pathlib import Path
import json,re,sys,datetime
# Corpus owner 2026-09-25: "make sure everything thats works or opera is vol numbered and what it contains is in as well".
# "The works of …" (Hammond, Joseph Hall, Lightfoot), "Theological Works" and "Scripta" are collected volumes too;
# "On Good Works", "the Works of Darkness" and "the Works of God" are not (TITLE only, never the slug).
COLLECTED=re.compile(r'\bopera\b|\bcomplete works\b|\bcollected (?:works|writings)\b|^works$|\bwerke\b',re.I)
COLLECTED_TITLE=re.compile(r'^(?:the\s+)?(?:(?:theological|philosophical|logical|select|minor|practical|polemical|dogmatic)\s+)?(?:w|vv)(?:o|ou)rke?s\b(?!\s+of\s+(?:darkness|god\b|the\s+flesh))|^scripta\b',re.I)
# Early printed collections whose outlines open on dedications: the summary is written from the outline.
SUMMARY={"hammond-works-reverend-learned-henry-hammond-d": "Paraphrase and annotations on the Psalms and Proverbs; nineteen sermons; Latin dissertations on Antichrist, Ignatius and the apostolic writings; on confirmation","joseph-hall-vvorks-ioseph-hall-doctor-diuinitie-deane": "Meditations and Vows; Heaven upon Earth; The Art of Divine Meditation; Characters of Virtues and Vices; Salomon's Divine Arts; Epistles in six decades; sermons","lightfoot-the-works-of-the-reverend-and-learned-john-l": "A chronicle and order of the texts of the Old Testament; the harmony, chronicle and order of the New Testament; the harmony of the four Evangelists","calov-scripta-philosophica": "Gnostologia; Noologia; Metaphysica divina, general and special parts"}
# Dedications, tables and indexes in those same outlines are not what a volume contains.
FRONT=re.compile(r'^(?:to\s+(?:the|my|his|our|iacob|m\.|mr\.|sir)\b|written\s+to\b|a\s+preface\b|the\s+preface\b|preface\b|advertisement|lectori|erudito|(?:the\s+)?epistle\s+(?:dedicatory|to\s+the\s+reader)|dedicat|an?\s+(?:alphabetical\s+)?(?:table|index)\b|the\s+(?:table|contents|titles|summe|svmme|severall\s+treatises)\b|errata|imprimatur|some\s+account\b|ad\s+autorem|iohannes\s+light|for\s+his\s+most)',re.I)
EXCLUDED=re.compile(r'(?:introductory material|front matter|concluding material|back matter|abschließendes material|einleitendes material)',re.I)
WRAPPER=re.compile(r'^(?:main text|main part|text|works|complete works|opera(?: omnia)?|\[?[A-Z]\]?)\.?$',re.I)
FURNITURE=re.compile(r'^(?:\[?title page\]?|preface|introduction|contents|table of contents|index(?:es)?|corrections|errata|remark|list of subscribers|first list of subscribers|vor rede\.?(?: \(preface\.\))?)\.?$',re.I)
BARE_BOOK=re.compile(r'^(?:the )?(?:book|part|treatise|volume)(?: the)? (?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|[ivxlcdm\d]+)\.?$',re.I)
def sections(meta):
    rows=[];skip=None
    for raw in meta.get('structure',[]):
        title=str(raw.get('title','')).strip();page=raw.get('page');depth=int(raw.get('depth') or 1)
        if skip is not None:
            if depth>skip:continue
            skip=None
        if EXCLUDED.search(title):skip=depth;continue
        if not title or page is None or WRAPPER.fullmatch(title) or FURNITURE.fullmatch(title) or re.match(r'^(?:preface\b|prologue\b|to the (?:most excellent )?reader\b|dedicat|index\b|triple index|books already published|admonition\b)',title,re.I):continue
        if title.casefold().strip('.')==str(meta.get('title','')).casefold().strip('.'):continue
        rows.append({'title':title,'page':str(page),'depth':depth})
    rows=[r for r in rows if not BARE_BOOK.fullmatch(r['title']) and not re.fullmatch(r'\d+\. Teil\.?',r['title'])]
    if not rows:return []
    depth=min(r['depth'] for r in rows)
    top=[r for r in rows if r['depth']==depth]
    # A generic book marker has no subject; preserve only the meaningful label below it.
    meaningful=[r for r in top if not BARE_BOOK.fullmatch(r['title'])]
    if meaningful:top=meaningful
    seen=set();result=[]
    for r in top:
        key=(r['title'].casefold(),r['page'])
        if key in seen:continue
        seen.add(key);result.append({'title':r['title'],'page':r['page']})
    return result

def build(catalogue,metadata):
    result={};missing=[]
    for w in catalogue['works']:
        slug=w['slug']
        if re.match(r'^(pld|pg|po|eebo)-\d+$',slug) or not (COLLECTED.search(w.get('title','')+' '+slug) or COLLECTED_TITLE.search(w.get('title',''))):continue
        path=metadata/(slug+'.json')
        if not path.exists():missing.append(slug);continue
        meta=json.loads(path.read_text());items=sections(meta)
        if slug in SUMMARY:items=[i for i in items if not FRONT.search(i['title'])]
        volume=str(meta.get('volume') or w.get('volume') or '')
        parts=volume.split(' · ',1)
        summary=parts[1].strip() if len(parts)>1 else ''
        # These words are published catalogue descriptions, not generated summaries.
        if not summary and items:
            def preview_title(item):
                title=item['title']
                translated=re.search(r'\(((?:A|An|The) .+)\)\.?$',title)
                return (translated.group(1) if translated else title).rstrip('.')
            summary='; '.join(preview_title(i) for i in items[:3])
        if slug in SUMMARY:summary=SUMMARY[slug]
        if slug=='luther-wa-schriften-55-ii':
            # The published outline places every entry on 1028; do not invent section anchors.
            summary='Psalm texts and notes; description of the Dresden scholia manuscript; editorial material'
        result[slug]={'summary':summary,'volume':parts[0].strip(),'sections':items,'source':'/v1/works/'+slug+'/meta.json'}
    if missing:raise ValueError('Missing metadata: '+', '.join(missing))
    return {'generated':str(datetime.date.today()),'works':result}
if __name__=='__main__':
    cat,meta,out=map(Path,sys.argv[1:]);data=build(json.loads(cat.read_text()),meta)
    out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    print(len(data['works']),'collected volumes;',sum(bool(v['sections']) for v in data['works'].values()),'with sections')
