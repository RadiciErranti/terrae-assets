(function() {

  // Eseguito una sola volta per sessione grazie al flag su window
  if (window._terraeCarouselBooted) {
    // Lo script è già attivo: il MutationObserver gestisce tutto
    return;
  }
  window._terraeCarouselBooted = true;

  var SHEET_ID   = '16gaKN5vvNRYcnutzrDTiOWLOYyyufm6KlvQC5VCwL2I';
  var SHEET_URL  = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&sheet=News';
  var DETAIL_URL = 'https://terraefilmfest.xyz/news';
  var HUES       = [18,130,28,210,280,60,160,340];
  var PATTERNS   = ['diag','grid','dots'];

  // Cache news in memoria per non rifetchare ad ogni ritorno
  var NEWS_CACHE = null;
  var IS_LOADING = false;
  var INDEX      = 0;
  var AUTOPLAY   = null;
  var mqMobile   = window.matchMedia('(max-width:600px)');

  function placeholderSVG(hue, pat) {
    var bg='oklch(0.78 0.06 '+hue+')', fg='oklch(0.55 0.08 '+hue+')';
    var p='';
    if (pat==='diag') p='<pattern id="p" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="'+bg+'"/><line x1="0" y1="0" x2="0" y2="14" stroke="'+fg+'" stroke-width="6"/></pattern>';
    else if (pat==='grid') p='<pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="'+bg+'"/><path d="M20 0H0v20" stroke="'+fg+'" stroke-width="1" fill="none"/></pattern>';
    else p='<pattern id="p" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="'+bg+'"/><circle cx="8" cy="8" r="2.2" fill="'+fg+'"/></pattern>';
    return '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>'+p+'</defs><rect width="400" height="300" fill="url(#p)"/></svg>';
  }

  function parseCSV(csv) {
    var rows=[], row=[], cur='', inQ=false;
    for (var i=0; i<csv.length; i++) {
      var c=csv[i];
      if (inQ) {
        if (c==='"'&&csv[i+1]==='"'){cur+='"';i++;}
        else if (c==='"'){inQ=false;}
        else{cur+=c;}
      } else {
        if (c==='"'){inQ=true;}
        else if (c===','){row.push(cur);cur='';}
        else if (c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}
        else if (c==='\r'){}
        else{cur+=c;}
      }
    }
    if (cur||row.length){row.push(cur);rows.push(row);}
    return rows;
  }

  function csvToNews(csv) {
    return parseCSV(csv).slice(1).map(function(cols,i) {
      var titolo=(cols[0]||'').trim();
      var data=(cols[1]||'').trim();
      var estratto=(cols[2]||'').trim();
      var immagine=(cols[3]||'').trim();
      var tag=((cols[4]||'NEWS').trim()).toUpperCase();
      var pubblicato=(cols[6]||'').trim().toLowerCase();
      if (pubblicato!=='si'||!titolo) return null;
      return {id:i,titolo:titolo,data:data,estratto:estratto,immagine:immagine,tag:tag,hue:HUES[i%HUES.length],pattern:PATTERNS[i%PATTERNS.length]};
    }).filter(Boolean);
  }

  function stripHTML(str) {
    var tmp=document.createElement('div');
    tmp.innerHTML=str;
    return tmp.textContent||tmp.innerText||'';
  }

  function goToDetail(id) {
    try { localStorage.setItem('terrae-news-id', String(id)); } catch(e) {}
    try { window.top.location.href=DETAIL_URL; } catch(e) { window.location.href=DETAIL_URL; }
  }

  function getEl(id) { return document.getElementById(id); }

  function cardW() {
    var track=getEl('terrae-track');
    var f=track?track.querySelector('.card'):null;
    return f?f.offsetWidth:325;
  }

  function visibleCount() {
    var root=getEl('terrae-carousel-root');
    var vp=root?root.querySelector('.viewport'):null;
    if (!vp) return 3;
    return Math.max(1,Math.floor((vp.offsetWidth+20)/(cardW()+20)));
  }

  function update() {
    var track=getEl('terrae-track');
    var prev=getEl('terrae-prev');
    var next=getEl('terrae-next');
    if (!track||!prev||!next) return;
    var v=visibleCount(), max=Math.max(0,(NEWS_CACHE?NEWS_CACHE.length:0)-v);
    if (INDEX>max) INDEX=max;
    if (INDEX<0) INDEX=0;
    track.style.transform='translateX('+(-INDEX*(cardW()+20))+'px)';
    prev.disabled=INDEX<=0;
    next.disabled=INDEX>=max;
  }

  function stopAutoplay() {
    if (AUTOPLAY){clearInterval(AUTOPLAY);AUTOPLAY=null;}
  }

  function startAutoplay() {
    stopAutoplay();
    if (!mqMobile.matches) return;
    AUTOPLAY=setInterval(function(){
      if (!NEWS_CACHE) return;
      var v=visibleCount(), max=Math.max(0,NEWS_CACHE.length-v);
      INDEX=INDEX>=max?0:INDEX+1;
      update();
    },3500);
  }

  function renderCards(news) {
    var track=getEl('terrae-track');
    if (!track) return;
    track.innerHTML='';
    if (!news||!news.length){track.innerHTML='<div class="loading">Nessuna news pubblicata.</div>';return;}
    news.forEach(function(n,idx){
      var el=document.createElement('article');
      el.className='card';
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.addEventListener('click',function(){goToDetail(idx);});
      el.addEventListener('keydown',function(e){if(e.key==='Enter')goToDetail(idx);});
      var thumb=n.immagine
        ?'<img src="'+n.immagine+'" alt="'+stripHTML(n.titolo)+'" loading="lazy">'
        :placeholderSVG(n.hue,n.pattern);
      el.innerHTML=
        '<div class="thumb">'+thumb+(n.data?'<span class="date-badge">'+stripHTML(n.data)+'</span>':'')+'</div>'+
        '<div class="card-text">'+
          '<div class="kicker">'+stripHTML(n.tag)+'</div>'+
          '<div class="title">'+stripHTML(n.titolo)+'</div>'+
          (n.estratto?'<div class="excerpt">'+stripHTML(n.estratto)+'</div>':'')+
        '</div>';
      track.appendChild(el);
    });
  }

  async function fetchAndRender() {
    if (IS_LOADING) return;
    IS_LOADING=true;
    var track=getEl('terrae-track');
    if (track) track.innerHTML='<div class="loading">Caricamento…</div>';
    try {
      var ctrl=new AbortController();
      var t=setTimeout(function(){ctrl.abort();},8000);
      var res=await fetch(SHEET_URL+'&t='+Date.now(),{cache:'no-store',signal:ctrl.signal});
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP '+res.status);
      var csv=await res.text();
      NEWS_CACHE=csvToNews(csv);
      if (!NEWS_CACHE.length) throw new Error('Nessuna news pubblicata');
    } catch(e) {
      var tr=getEl('terrae-track');
      if (tr) tr.innerHTML='<div class="loading">Errore: '+(e.name==='AbortError'?'Timeout':e.message)+'</div>';
      IS_LOADING=false;
      return;
    }
    IS_LOADING=false;
    renderCards(NEWS_CACHE);
    INDEX=0;
    attachEvents();
    update();
    startAutoplay();
  }

  function mountCarousel() {
    // Se abbiamo già le news in cache, ridisegna senza fetch
    if (NEWS_CACHE && NEWS_CACHE.length) {
      renderCards(NEWS_CACHE);
      INDEX=0;
      attachEvents();
      update();
      startAutoplay();
    } else {
      fetchAndRender();
    }
  }

  function attachEvents() {
    var prev=getEl('terrae-prev');
    var next=getEl('terrae-next');
    var root=getEl('terrae-carousel-root');
    if (!prev||!next||!root) return;
    // Clona per rimuovere listener precedenti
    var np=prev.cloneNode(true), nn=next.cloneNode(true);
    prev.parentNode.replaceChild(np,prev);
    next.parentNode.replaceChild(nn,next);
    np.addEventListener('click',function(e){e.stopPropagation();stopAutoplay();INDEX--;update();});
    nn.addEventListener('click',function(e){e.stopPropagation();stopAutoplay();INDEX++;update();});
    var vp=root.querySelector('.viewport');
    if (vp) vp.addEventListener('touchstart',stopAutoplay,{passive:true});
  }

  // --- MutationObserver sul body ---
  // Intercetta quando Readymag rimette nel DOM il widget (con track vuoto)
  var observer = new MutationObserver(function() {
    var track=getEl('terrae-track');
    if (!track) return;
    // Track presente ma senza card e senza "loading" in corso
    var hasCards=track.querySelector('.card');
    var hasLoading=track.querySelector('.loading');
    if (!hasCards && !IS_LOADING) {
      // Rimonta il carosello
      if (!hasLoading) {
        track.innerHTML='<div class="loading">Caricamento…</div>';
      }
      // Piccolo delay per lasciar finire il rendering Readymag
      setTimeout(mountCarousel, 200);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Resize
  var rt;
  window.addEventListener('resize',function(){
    clearTimeout(rt);
    rt=setTimeout(function(){update();startAutoplay();},120);
  });
  if (mqMobile.addEventListener) mqMobile.addEventListener('change',startAutoplay);

  // Prima esecuzione immediata
  mountCarousel();

})();
