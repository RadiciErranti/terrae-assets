(function() {

  var ROOT = document.getElementById('terrae-carousel-root');
  if (!ROOT) return;
  if (ROOT._terraeCarousel) { ROOT._terraeCarousel.reinit(); return; }

  var SHEET_ID   = '16gaKN5vvNRYcnutzrDTiOWLOYyyufm6KlvQC5VCwL2I';
  var SHEET_URL  = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&sheet=News';
  var DETAIL_URL = 'https://terraefilmfest.xyz/news';
  var HUES       = [18,130,28,210,280,60,160,340];
  var PATTERNS   = ['diag','grid','dots'];

  function placeholderSVG(hue, pat) {
    var bg = 'oklch(0.78 0.06 ' + hue + ')', fg = 'oklch(0.55 0.08 ' + hue + ')';
    var p = '';
    if (pat === 'diag') p = '<pattern id="p" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="' + bg + '"/><line x1="0" y1="0" x2="0" y2="14" stroke="' + fg + '" stroke-width="6"/></pattern>';
    else if (pat === 'grid') p = '<pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="' + bg + '"/><path d="M20 0H0v20" stroke="' + fg + '" stroke-width="1" fill="none"/></pattern>';
    else p = '<pattern id="p" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="' + bg + '"/><circle cx="8" cy="8" r="2.2" fill="' + fg + '"/></pattern>';
    return '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>' + p + '</defs><rect width="400" height="300" fill="url(#p)"/></svg>';
  }

  function parseCSV(csv) {
    var rows = [], row = [], cur = '', inQ = false;
    for (var i = 0; i < csv.length; i++) {
      var c = csv[i];
      if (inQ) {
        if (c === '"' && csv[i+1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else { cur += c; }
      } else {
        if (c === '"') { inQ = true; }
        else if (c === ',') { row.push(cur); cur = ''; }
        else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else if (c === '\r') {}
        else { cur += c; }
      }
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function csvToNews(csv) {
    return parseCSV(csv).slice(1).map(function(cols, i) {
      var titolo     = (cols[0] || '').trim();
      var data       = (cols[1] || '').trim();
      var estratto   = (cols[2] || '').trim();
      var immagine   = (cols[3] || '').trim();
      var tag        = ((cols[4] || 'NEWS').trim()).toUpperCase();
      var pubblicato = (cols[6] || '').trim().toLowerCase();
      if (pubblicato !== 'si' || !titolo) return null;
      return { id: i, titolo: titolo, data: data, estratto: estratto, immagine: immagine, tag: tag, hue: HUES[i % HUES.length], pattern: PATTERNS[i % PATTERNS.length] };
    }).filter(Boolean);
  }

  function stripHTML(str) {
    var tmp = document.createElement('div');
    tmp.innerHTML = str;
    return tmp.textContent || tmp.innerText || '';
  }

  function goToDetail(id) {
    try { localStorage.setItem('terrae-news-id', String(id)); } catch(e) {}
    try { window.top.location.href = DETAIL_URL; } catch(e) { window.location.href = DETAIL_URL; }
  }

  var track = document.getElementById('terrae-track');
  var prev  = document.getElementById('terrae-prev');
  var next  = document.getElementById('terrae-next');
  var NEWS  = [];
  var index = 0;
  var autoplayTimer = null;
  var mqMobile = window.matchMedia('(max-width:600px)');

  function renderCards() {
    track.innerHTML = '';
    if (!NEWS.length) { track.innerHTML = '<div class="loading">Nessuna news pubblicata.</div>'; return; }
    NEWS.forEach(function(n, idx) {
      var el = document.createElement('article');
      el.className = 'card';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', function() { goToDetail(idx); });
      el.addEventListener('keydown', function(e) { if (e.key === 'Enter') goToDetail(idx); });
      var thumb = n.immagine
        ? '<img src="' + n.immagine + '" alt="' + stripHTML(n.titolo) + '" loading="lazy">'
        : placeholderSVG(n.hue, n.pattern);
      el.innerHTML =
        '<div class="thumb">' + thumb + (n.data ? '<span class="date-badge">' + stripHTML(n.data) + '</span>' : '') + '</div>' +
        '<div class="card-text">' +
          '<div class="kicker">' + stripHTML(n.tag) + '</div>' +
          '<div class="title">' + stripHTML(n.titolo) + '</div>' +
          (n.estratto ? '<div class="excerpt">' + stripHTML(n.estratto) + '</div>' : '') +
        '</div>';
      track.appendChild(el);
    });
  }

  async function loadNews() {
    try {
      var ctrl = new AbortController();
      var t = setTimeout(function() { ctrl.abort(); }, 8000);
      var res = await fetch(SHEET_URL + '&t=' + Date.now(), { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var csv = await res.text();
      NEWS = csvToNews(csv);
      if (!NEWS.length) throw new Error('Nessuna news con "si" nella colonna Pubblicato');
    } catch(e) {
      track.innerHTML = '<div class="loading">Errore: ' + (e.name === 'AbortError' ? 'Timeout' : e.message) + '</div>';
      return false;
    }
    return true;
  }

  function cardW() { var f = track.querySelector('.card'); return f ? f.offsetWidth : 325; }
  function visibleCount() { return Math.max(1, Math.floor((ROOT.querySelector('.viewport').offsetWidth + 20) / (cardW() + 20))); }

  function update() {
    var v = visibleCount(), max = Math.max(0, NEWS.length - v);
    if (index > max) index = max;
    if (index < 0) index = 0;
    track.style.transform = 'translateX(' + (-index * (cardW() + 20)) + 'px)';
    prev.disabled = index <= 0;
    next.disabled = index >= max;
  }

  function startAutoplay() {
    stopAutoplay();
    if (!mqMobile.matches) return;
    autoplayTimer = setInterval(function() {
      var v = visibleCount(), max = Math.max(0, NEWS.length - v);
      index = index >= max ? 0 : index + 1;
      update();
    }, 3500);
  }

  function stopAutoplay() {
    if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
  }

  async function init() {
    track.innerHTML = '<div class="loading">Caricamento…</div>';
    index = 0;
    var ok = await loadNews();
    if (ok) { renderCards(); update(); startAutoplay(); }
  }

  prev.addEventListener('click', function(e) { e.stopPropagation(); stopAutoplay(); index--; update(); });
  next.addEventListener('click', function(e) { e.stopPropagation(); stopAutoplay(); index++; update(); });
  ROOT.querySelector('.viewport').addEventListener('touchstart', stopAutoplay, { passive: true });

  var rt;
  window.addEventListener('resize', function() {
    clearTimeout(rt);
    rt = setTimeout(function() { index = 0; update(); startAutoplay(); }, 120);
  });
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', startAutoplay);

  ROOT._terraeCarousel = { reinit: init };
  init();

})();
