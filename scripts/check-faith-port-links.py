#!/usr/bin/env python3
"""Check source page destinations and emitted Ghost links without changing either site."""
import argparse, concurrent.futures, json
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlunsplit
from urllib.request import urlopen
from urllib.error import HTTPError
class Links(HTMLParser):
    def __init__(self): super().__init__(); self.links=set(); self.assets=set()
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='a' and a.get('href'): self.links.add(a['href'])
        if tag=='script' and a.get('src'): self.assets.add(a['src'])
        if tag=='link' and a.get('rel')=='stylesheet' and a.get('href'): self.assets.add(a['href'])
MAP={'index':'all-works','read':'read','search':'search','ask':'ask','desk':'desk','pins':'pins','bible':'bible','authors':'author','fathers':'fathers','topics':'topics','compare':'compare','web':'web','dtc':'dictionary','readen':'readen','review':'review'}
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);ap.add_argument('--base',default='http://localhost:2368');ap.add_argument('--output',required=True);args=ap.parse_args()
    discovered={};queue=set();page_map=[]
    for name,target in MAP.items():
        f=Path(args.source)/(name+'.html')
        if not f.exists():continue
        parsed=Links();parsed.feed(f.read_text())
        local='/the-faith-received/'+target+'/'
        page_map.append({'source':'/'+('' if name=='index' else name),'local':local});queue.add(local)
        for link in parsed.links:
            u=urlsplit(link)
            if u.netloc and u.netloc!='thefaithreceived.vercel.app':continue
            if not u.path.startswith('/'):continue
            stem=u.path.strip('/').removesuffix('.html') or 'index'
            if stem in MAP:
                dest=urlunsplit(('','','/the-faith-received/'+MAP[stem]+'/',u.query,''));queue.add(dest);discovered[link]=dest
    def check(path):
        try:
            with urlopen(args.base+path,timeout=25) as r:
                text=r.read().decode('utf-8','replace'); parser=Links();parser.feed(text)
                return {'path':path,'status':r.status,'links':sorted(parser.links),'assets':sorted(parser.assets)}
        except HTTPError as e:return {'path':path,'status':e.code,'links':[],'assets':[]}
        except Exception as e:return {'path':path,'status':'error','error':str(e),'links':[],'assets':[]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(check,sorted(queue)))
    extra=set()
    for r in results:
        for raw in r['links']+r['assets']:
            u=urlsplit(raw)
            if u.netloc and u.netloc!=urlsplit(args.base).netloc:continue
            if u.path.startswith(('/the-faith-received/','/assets/')):extra.add(urlunsplit(('','',u.path,u.query,'')))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: linked=list(pool.map(check,sorted(extra-queue)))
    report={'scope':'Source HTML page inventory and static internal links, plus links/assets emitted by anonymous Ghost pages. Dynamic work links and signed-in behavior require browser tests.','mapping':page_map,'sourceLinks':discovered,'checks':results+linked}
    Path(args.output).write_text(json.dumps(report,indent=2))
    bad=[{'path':r['path'],'status':r['status']} for r in report['checks'] if r['status']!=200]
    print(json.dumps({'pages':len(page_map),'sourceLinks':len(discovered),'checks':len(report['checks']),'failures':bad},indent=2))
if __name__=='__main__':main()
