/* MereO runtime data boundary. Loaded before the catalogue and every ported page.
 * Legacy addresses identify migrated resources; they are never network destinations.
 */
(function(root){
  'use strict';
  const LIB='https://mo-tfr-library.mo-podcast-feed.workers.dev';
  const ASK='https://mo-tfr-ask-dev.mo-podcast-feed.workers.dev/v1';
  const FAMILIES={'eebo-backup.vercel.app':'eebo','pld-patrologia-latina.vercel.app':'pld',
    'patrologia-graeca.vercel.app':'pg','patrologia-orientalis.vercel.app':'po','aquinas-studies.vercel.app':'augustine'};
  const BLOBS={'0ss8v4l06kodnhp0.public.blob.vercel-storage.com':'',
    'xmw4yslyv6oq3m7i.public.blob.vercel-storage.com':'/pg/scan',
    'fqzfe6cpzqk0a5qv.public.blob.vercel-storage.com':'/po/scan'};
  const blocked=host=>/(^|\.)(vercel\.app|vercel\.sh|vercel\.com|vercel-storage\.com|openrouter\.ai|upstash\.io|upstash\.com|hf\.space|huggingface\.co)$/.test(host.replace(/\.$/,''));
  function dataURL(raw,origin){
    const u=new URL(raw,origin),host=u.hostname.toLowerCase();
    if(host==='mo-tfr.mo-podcast-feed.workers.dev')return LIB+u.pathname+u.search+u.hash;
    if(Object.hasOwn(BLOBS,host)){
      let path=u.pathname;
      if(!BLOBS[host]&&/^\/tei\/(?:pld|pg|po)\//.test(path))path=`/v1${path}`;
      return LIB+BLOBS[host]+path+u.search+u.hash;
    }
    if(FAMILIES[host]){
      if(u.pathname.startsWith('/data/'))return `${LIB}/v1/catalogues/${FAMILIES[host]}${u.pathname.slice(5)}${u.search}${u.hash}`;
      if(u.pathname.startsWith('/read/'))return `${LIB}/${FAMILIES[host]}${u.pathname}${u.search}${u.hash}`;
      throw new Error('This source-library path has not been migrated to Cloudflare');
    }
    if(host==='thefaithreceived.vercel.app'&&u.pathname.startsWith('/api/')){
      const resource=u.pathname.slice(5);
      if(/^(?:ask|vsearch|xsearch|evidence|related|investigations)(?:\/|$)/.test(resource))return `${ASK}/${resource}${u.search}`;
    }
    if(blocked(host))throw new Error('This external provider is not used by Mere Orthodoxy');
    return u.href;
  }
  function rewriteText(text,origin){
    return String(text).replace(/https?:\/\/[^\s"'<>\x60\\)]+/g,raw=>{
      try{return dataURL(raw,origin);}catch{return raw;}
    });
  }
  const api={dataURL,rewriteText,blocked};
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  if(root.FRCloudflareRuntime||!root.fetch)return;
  if(root.document&&!root.location.pathname.startsWith('/the-faith-received'))return;
  root.FRCloudflareRuntime=api;
  const {origin} = root.location,fetch=root.fetch.bind(root);
  const verified=new Map();
  function needsPolicy(raw,method='GET'){
    const u=new URL(raw,origin);
    if(u.pathname==='/v1/runtime-policy')return false;
    if(u.origin===new URL(ASK).origin)return true;
    if(u.origin!==LIB)return false;
    // Existing public JSON/XML reads already come directly from R2. Older scan
    // and API handlers can reach external providers, so require the new worker.
    return method!=='GET'&&method!=='HEAD'||!/\.(?:json|xml)(?:\.gz)?$/.test(u.pathname);
  }
  function ensurePolicy(raw){
    const worker=new URL(raw,origin).origin;
    if(!verified.has(worker))verified.set(worker,fetch(`${worker}/v1/runtime-policy`,{cache:'no-store'}).then(async response=>{
      const policy=response.ok?await response.json():null;
      if(policy?.policy!=='cloudflare-only-v1'||policy.externalFallback!==false)throw new Error('The library service update is pending. Please try again later.');
    }).catch(error=>{verified.delete(worker);throw error;}));
    return verified.get(worker);
  }
  root.fetch=function(input,init){
    let next;
    try{next=dataURL(typeof input==='string'||input instanceof URL?String(input):input.url,origin);}
    catch(error){return Promise.reject(error);}
    const request=typeof input==='string'||input instanceof URL?next:new Request(next,input);
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    return (needsPolicy(next,method)?ensurePolicy(next):Promise.resolve()).then(()=>fetch(request,init)).then(async response=>{
      const type=response.headers.get('content-type')||'';
      if(!response.ok||!/json/i.test(type)||/ndjson|event-stream/i.test(type))return response;
      const original=await response.clone().text(),changed=rewriteText(original,origin);
      if(changed===original)return response;
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(changed,{status:response.status,statusText:response.statusText,headers});
    });
  };
  if(root.XMLHttpRequest){
    const {open} = root.XMLHttpRequest.prototype;
    root.XMLHttpRequest.prototype.open=function(method,url,...args){return open.call(this,method,dataURL(String(url),origin),...args);};
  }
  if(root.navigator?.sendBeacon){
    const beacon=root.navigator.sendBeacon.bind(root.navigator);
    root.navigator.sendBeacon=(url,data)=>{try{return beacon(dataURL(String(url),origin),data);}catch{return false;}};
  }
  for(const key of ['EventSource','WebSocket']){
    if(!root[key])continue;
    const Original=root[key];
    root[key]=class extends Original{constructor(url,...args){super(dataURL(String(url),origin),...args);}};
  }
  if(root.document){
    // A second CSP narrows the site's policy on TFR pages. It also covers passive
    // image/frame requests, which cannot reliably be stopped by a fetch wrapper.
    const policy=root.document.createElement('meta');policy.httpEquiv='Content-Security-Policy';
    policy.content="connect-src 'self' https://*.mo-podcast-feed.workers.dev https://mereorthodoxy.com https://www.mereorthodoxy.com https://mo-test.ghost.io https://api.stripe.com https://plausible.io https://challenges.cloudflare.com; img-src 'self' data: blob: https://*.mo-podcast-feed.workers.dev https://*.ghost.io https://images.unsplash.com https://www.gravatar.com https://secure.gravatar.com https://archive.org https://*.archive.org https://books.google.com https://books.googleusercontent.com; worker-src 'self' blob:; frame-src 'self' https://mereorthodoxy.com https://mo-test.ghost.io https://js.stripe.com https://challenges.cloudflare.com";
    root.document.head.appendChild(policy);
  }
})(typeof window==='undefined'?globalThis:window);
