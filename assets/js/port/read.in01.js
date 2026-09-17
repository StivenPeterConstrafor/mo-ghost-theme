window.__FR_BLOB_BASE__="https://mo-tfr-library.mo-podcast-feed.workers.dev";/* __FR_VER was the literal 1789053103. reader-core.js builds every
   port asset URL as ...?v=__FR_VER, and the theme serves those with
   cache-control max-age=31536000. A frozen constant on a URL cached
   for a year means a fix to a port asset can never reach a browser
   that has loaded the reader once: the guard patch in read-tools.js
   was live on the server and still absent in the page.
   Taken from this script's own ?v= instead, which the {{asset}}
   helper rewrites on every theme deploy. Falls back to the old
   constant so nothing depends on currentScript existing. */
window.__FR_VER=(function(){try{var s=document.currentScript&&document.currentScript.src;var m=s&&s.match(/[?&]v=([^&]+)/);return m?decodeURIComponent(m[1]):"1789053103";}catch(e){return "1789053103";}})();window.__FR_FB__={"apiKey": "AIzaSyDKCgrUIFVQHTGiCGZN0iOrzTjtdPxqZfs", "authDomain": "aquinas-studies.firebaseapp.com", "projectId": "aquinas-studies", "storageBucket": "aquinas-studies.firebasestorage.app", "messagingSenderId": "508363257926", "appId": "1:508363257926:web:9ea0570d13c4909b697247"};window.__FR_SITE__="faith-received";window.__FR_ASK_WORKSPACE__=true;try{const t=localStorage.getItem("fr_theme");if(["light","dark","sepia"].includes(t))document.documentElement.dataset.theme=t;}catch(e){}window.__FR_EDITION_VOLUMES__={"quenstedt-systema-theologicum": "Wittenberg 1691", "quenstedt-theologia-didactico-polemica": "Leipzig 1715"};