const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const runtime=require('../assets/js/page/faith-cloudflare-runtime.js');
const links=require('../assets/js/page/faith-port-links.js');
const origin='https://mereorthodoxy.com',lib='https://mo-tfr-library.mo-podcast-feed.workers.dev';
test('every source catalogue family resolves to the migrated Cloudflare metadata',()=>{
  for(const [host,family,file] of [['eebo-backup','eebo','catalogue'],['pld-patrologia-latina','pld','nav'],['patrologia-graeca','pg','nav'],['patrologia-orientalis','po','nav'],['aquinas-studies','augustine','nav']]){
    assert.equal(runtime.dataURL('https://'+host+'.vercel.app/data/'+file+'.json',origin),lib+'/v1/catalogues/'+family+'/'+file+'.json');
  }
});
test('legacy scan and TEI addresses retain paths without reaching Blob',()=>{
  assert.equal(runtime.dataURL('https://0ss8v4l06kodnhp0.public.blob.vercel-storage.com/tei/pld/42.xml',origin),lib+'/v1/tei/pld/42.xml');
  assert.equal(runtime.dataURL('https://xmw4yslyv6oq3m7i.public.blob.vercel-storage.com/migne/52/183.jpg',origin),lib+'/pg/scan/migne/52/183.jpg');
  assert.throws(()=>runtime.dataURL('https://unknown.vercel.app/api',origin),/not used/);
  assert.throws(()=>runtime.dataURL('https://openrouter.ai/api/v1',origin),/not used/);
});
test('family reader links stay in Ghost and preserve opaque column anchors',()=>{
  assert.equal(links.localURL('https://patrologia-graeca.vercel.app/read/42.html#c52:0183A',origin),'/the-faith-received/read/?w=pg-42#b52:0183A-0');
  assert.equal(links.localURL('https://pld-patrologia-latina.vercel.app/read/7#b183-0',origin),'/the-faith-received/read/?w=pld-7#b183-0');
});
test('the early guard runs in workers, rebases requests, and refuses an old Ask service',async()=>{
  const calls=[],sandbox={URL,Request,Response,Headers,location:{origin},fetch:async(url)=>{
    calls.push(String(url));
    if(String(url).endsWith('/runtime-policy'))return new Response('{}',{status:404});
    return new Response('{"ok":true}',{headers:{'content-type':'application/json'}});
  }};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/page/faith-cloudflare-runtime.js'),'utf8'),sandbox);
  await sandbox.fetch('https://pld-patrologia-latina.vercel.app/data/nav.json');
  assert.equal(calls[0],lib+'/v1/catalogues/pld/nav.json');
  await assert.rejects(sandbox.fetch('https://mo-tfr-ask-dev.mo-podcast-feed.workers.dev/v1/ask',{method:'POST',body:'{}'}),/update is pending/);
  assert.ok(!calls.some(url=>url.endsWith('/v1/ask')));
  assert.ok(!calls.some(url=>/vercel|openrouter/.test(url)));
});
test('approved workers receive API requests and streaming responses are not buffered',async()=>{
  const calls=[],sandbox={URL,Request,Response,Headers,location:{origin},fetch:async(url)=>{
    calls.push(String(url));
    if(String(url).endsWith('/runtime-policy'))return new Response('{"policy":"cloudflare-only-v1","externalFallback":false}',{headers:{'content-type':'application/json'}});
    return new Response('{"type":"progress"}\n',{headers:{'content-type':'application/x-ndjson'}});
  }};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/page/faith-cloudflare-runtime.js'),'utf8'),sandbox);
  const result=await sandbox.fetch('https://mo-tfr-ask-dev.mo-podcast-feed.workers.dev/v1/ask',{method:'POST',body:'{}'});
  assert.equal(await result.text(),'{"type":"progress"}\n');assert.equal(calls.length,2);
});
test('default layout installs the boundary before catalogue and page code',()=>{
  const source=fs.readFileSync(__dirname+'/../default.hbs','utf8');
  assert.ok(source.indexOf('faith-cloudflare-runtime.js')<source.indexOf('faith-catalogue.js'));
  assert.ok(source.indexOf('faith-cloudflare-runtime.js')<source.indexOf('{{{block "moHead"}}}'));
  const csp=source.match(/<meta http-equiv="Content-Security-Policy"[^>]+>/)[0];
  assert.ok(!/vercel|openrouter/.test(csp));
  const worker=fs.readFileSync(__dirname+'/../assets/js/port/ask-worker.js','utf8');
  assert.match(worker.split('\n')[0],/importScripts.*faith-cloudflare-runtime/);
});
