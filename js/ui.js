/**
 * ui.js — komponen antarmuka bersama: Modal, Laci, Tabel (cari/urut/halaman),
 * grafik SVG ringan, kerangka muat, bantuan form, peta Leaflet (dimuat saat perlu),
 * QR, dan cetak (A4 / A5 lanskap).
 */
(function () {
  'use strict';
  var esc = App.esc, ikon = App.ikon, $ = App.$, $$ = App.$$;

  // ------------------------------------------------------------------ MODAL & LACI
  var TERBUKA = [];
  /** tutupSemua() — dipanggil Shell saat pindah halaman agar modal/laci halaman lama tidak tertinggal. */
  function tutupSemua() { TERBUKA.slice().forEach(function (t) { t(); }); }
  function buatLapis(kelasPanel, o) {
    var lapis = document.createElement('div');
    lapis.className = 'lapis';
    var panel = document.createElement('div');
    panel.className = kelasPanel + (o.lebar ? ' ' + o.lebar : '');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.innerHTML = '<div class="modal-h"><h3>' + esc(o.judul || '') + '</h3><button class="btn btn-ghost btn-icon btn-sm" data-tutup aria-label="Tutup">' + ikon('close') + '</button></div>' +
      '<div class="modal-b">' + (o.isi || '') + '</div>' + (o.tombol && o.tombol.length ? '<div class="modal-f"></div>' : '');
    var tutup = function () { var i = TERBUKA.indexOf(tutup); if (i > -1) TERBUKA.splice(i, 1); document.removeEventListener('keydown', esc_); lapis.remove(); if (o.onTutup) o.onTutup(); };
    TERBUKA.push(tutup);
    var esc_ = function (e) { if (e.key === 'Escape') tutup(); };
    document.addEventListener('keydown', esc_);
    (o.tombol || []).forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn ' + (t.cls || 'btn-outline'); b.innerHTML = (t.ikon ? ikon(t.ikon) : '') + esc(t.l);
      b.onclick = function () { if (t.aksi) { var r = t.aksi(b, panel, tutup); if (r && r.then) { b.classList.add('loading'); r.then(function (x) { b.classList.remove('loading'); if (x !== false) tutup(); }, function (e) { b.classList.remove('loading'); App.toast(e.message, 'bad'); }); } else if (r !== false) tutup(); } else tutup(); };
      panel.querySelector('.modal-f').appendChild(b);
    });
    panel.querySelector('[data-tutup]').onclick = tutup;
    lapis.addEventListener('mousedown', function (e) { if (e.target === lapis && o.tutupLuar !== false) tutup(); });
    lapis.appendChild(panel);
    document.body.appendChild(lapis);
    setTimeout(function () { var f = panel.querySelector('.modal-b input:not([type=hidden]), .modal-b select, .modal-b textarea'); if (f && window.innerWidth > 680) f.focus(); }, 30);
    if (o.onBuka) o.onBuka(panel, tutup);
    return { el: panel, tutup: tutup };
  }
  var Modal = {
    buka: function (o) { return buatLapis('modal', o); },
    /** opsi: judul, ok, bahaya, alasan (label → wajib isi alasan), ketik (teks konfirmasi) */
    konfirm: function (pesan, o) {
      o = o || {};
      return new Promise(function (res) {
        var isi = '<p>' + pesan + '</p>' +
          (o.alasan ? '<div class="field"><label>' + esc(o.alasan) + ' <span class="req">*</span></label><textarea class="ta" data-alasan rows="3"></textarea></div>' : '') +
          (o.ketik ? '<div class="field"><label>Ketik <b class="mono">' + esc(o.ketik) + '</b> untuk melanjutkan</label><input class="inp" data-ketik autocomplete="off"></div>' : '');
        var selesai = false;
        Modal.buka({
          judul: o.judul || 'Konfirmasi', isi: isi, lebar: 'sempit', onTutup: function () { if (!selesai) res(false); },
          tombol: [{ l: 'Batal', cls: 'btn-outline' }, {
            l: o.ok || 'Ya, lanjutkan', cls: o.bahaya ? 'btn-danger' : 'btn-primary', aksi: function (b, p) {
              var a = p.querySelector('[data-alasan]'), k = p.querySelector('[data-ketik]');
              if (a && a.value.trim().length < 5) { a.classList.add('invalid'); App.toast('Isi alasan minimal 5 karakter.', 'warn'); return false; }
              if (k && k.value.trim() !== o.ketik) { k.classList.add('invalid'); return false; }
              selesai = true; res(a ? a.value.trim() : true);
            }
          }]
        });
      });
    }
  };
  var Laci = {
    buka: function (o) {
      var lapis = document.createElement('div'); lapis.className = 'lapis'; lapis.style.background = 'rgba(15,59,103,.25)';
      var p = document.createElement('aside'); p.className = 'laci'; p.setAttribute('role', 'dialog');
      p.innerHTML = '<div class="modal-h"><h3>' + esc(o.judul || '') + '</h3><button class="btn btn-ghost btn-icon btn-sm" data-tutup aria-label="Tutup">' + ikon('close') + '</button></div><div class="modal-b" style="flex:1">' + (o.isi || '') + '</div>' + (o.kaki ? '<div class="modal-f">' + o.kaki + '</div>' : '');
      var tutup = function () { var i = TERBUKA.indexOf(tutup); if (i > -1) TERBUKA.splice(i, 1); lapis.remove(); p.remove(); document.removeEventListener('keydown', k); if (o.onTutup) o.onTutup(); };
      TERBUKA.push(tutup);
      var k = function (e) { if (e.key === 'Escape') tutup(); };
      document.addEventListener('keydown', k);
      lapis.onclick = tutup; p.querySelector('[data-tutup]').onclick = tutup;
      document.body.appendChild(lapis); document.body.appendChild(p);
      if (o.onBuka) o.onBuka(p, tutup);
      return { el: p, tutup: tutup };
    }
  };

  // ------------------------------------------------------------------ TABEL
  /**
   * Tabel(el, cfg) — cfg: { kolom: [{k, l, f(row), sort, cls, kartu}], data, cari, saring(row,nilai), saringHtml,
   *   perHal, kosong: {ikon, judul, teks}, onRow(row), toolbar (html kanan), kartu (mode kartu di HP) }
   * Mempertahankan pencarian, urutan, dan halaman saat data diperbarui (tidak membangun ulang toolbar).
   */
  function Tabel(el, cfg) {
    var st = { q: '', sort: cfg.sortAwal || null, dir: cfg.dirAwal || 1, hal: 1, data: cfg.data || [], filter: {} };
    var per = cfg.perHal || 15;
    el.innerHTML = (cfg.cari !== false || cfg.toolbar || cfg.saringHtml ? '<div class="tbl-bar">' +
      (cfg.cari !== false ? '<div class="inp-ico">' + ikon('search') + '<input class="inp" type="search" placeholder="' + esc(cfg.cari || 'Cari…') + '" data-q></div>' : '') +
      (cfg.saringHtml || '') + '<div class="grow"></div>' + (cfg.toolbar || '') + '</div>' : '') +
      '<div class="tbl-wrap"><table class="tbl' + (cfg.kartu !== false ? ' kartu' : '') + '"><thead><tr>' +
      cfg.kolom.map(function (c, i) { return '<th data-i="' + i + '" class="' + (c.sort !== false && c.k ? 'sort ' : '') + (c.cls || '') + '"' + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + esc(c.l) + '</th>'; }).join('') +
      '</tr></thead><tbody></tbody></table></div><div class="pager"></div>';
    var tbody = el.querySelector('tbody'), pager = el.querySelector('.pager'), qi = el.querySelector('[data-q]');
    if (qi) qi.addEventListener('input', App.debounce(function () { st.q = qi.value.trim().toLowerCase(); st.hal = 1; render(); }, 150));
    $$('th.sort', el).forEach(function (th) {
      th.onclick = function () { var c = cfg.kolom[+th.dataset.i]; if (st.sort === c.k) st.dir = -st.dir; else { st.sort = c.k; st.dir = 1; } render(); };
    });
    $$('[data-saring]', el).forEach(function (s) { s.addEventListener('change', function () { st.filter[s.dataset.saring] = s.value; st.hal = 1; render(); }); });
    pager.addEventListener('click', function (e) { var b = e.target.closest('button[data-p]'); if (!b) return; st.hal = +b.dataset.p; render(); el.querySelector('.tbl-wrap').scrollIntoView({ block: 'nearest' }); });
    tbody.addEventListener('click', function (e) {
      var a = e.target.closest('[data-aksi]');
      if (a && cfg.onAksi) { e.stopPropagation(); var r = st.view[+a.closest('tr').dataset.r]; cfg.onAksi(a.dataset.aksi, r, a); return; }
      var tr = e.target.closest('tr[data-r]'); if (tr && cfg.onRow && !e.target.closest('a,button,input,select')) cfg.onRow(st.view[+tr.dataset.r]);
    });
    function teks(r) { return cfg.kolom.map(function (c) { var v = c.cariNilai ? c.cariNilai(r) : r[c.k]; return v === undefined || v === null ? '' : String(v); }).join(' ').toLowerCase(); }
    function render() {
      var d = st.data.filter(function (r) {
        if (st.q && teks(r).indexOf(st.q) === -1) return false;
        for (var k in st.filter) { if (st.filter[k] && cfg.saring && !cfg.saring(r, k, st.filter[k])) return false; }
        return true;
      });
      if (st.sort) {
        var c = cfg.kolom.filter(function (x) { return x.k === st.sort; })[0], f = c && c.nilaiUrut;
        d = d.slice().sort(function (a, b) { var x = f ? f(a) : a[st.sort], y = f ? f(b) : b[st.sort]; if (x === y) return 0; if (x === null || x === undefined || x === '') return 1; if (y === null || y === undefined || y === '') return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'id', { numeric: true })) * st.dir; });
      }
      $$('th', el).forEach(function (th) { var c = cfg.kolom[+th.dataset.i]; th.classList.toggle('asc', c && st.sort === c.k && st.dir === 1); th.classList.toggle('desc', c && st.sort === c.k && st.dir === -1); });
      var n = d.length, hal = Math.max(1, Math.ceil(n / per)); st.hal = Math.min(st.hal, hal);
      st.view = d.slice((st.hal - 1) * per, st.hal * per);
      if (!n) {
        var k = cfg.kosong || {};
        tbody.innerHTML = '<tr><td colspan="' + cfg.kolom.length + '"><div class="kosong">' + ikon(k.ikon || (st.q ? 'search_off' : 'inbox')) + '<h4>' + esc(st.q ? 'Tidak ada yang cocok' : (k.judul || 'Belum ada data')) + '</h4><div>' + (st.q ? 'Coba kata kunci lain.' : (k.teks || '')) + '</div></div></td></tr>';
      } else {
        tbody.innerHTML = st.view.map(function (r, i) {
          return '<tr data-r="' + i + '"' + (cfg.onRow ? ' class="klik"' : '') + '>' + cfg.kolom.map(function (c) {
            var v = c.f ? c.f(r) : esc(r[c.k] === undefined ? '' : r[c.k]);
            return '<td data-l="' + esc(c.l) + '" class="' + (c.cls || '') + '">' + v + '</td>';
          }).join('') + '</tr>';
        }).join('');
      }
      var dari = n ? (st.hal - 1) * per + 1 : 0, sampai = Math.min(n, st.hal * per), tombol = '';
      if (hal > 1) {
        var awal = Math.max(1, Math.min(st.hal - 2, hal - 4)), akhir = Math.min(hal, awal + 4);
        tombol = '<button data-p="' + (st.hal - 1) + '"' + (st.hal === 1 ? ' disabled' : '') + ' aria-label="Sebelumnya">‹</button>';
        for (var i = awal; i <= akhir; i++) tombol += '<button data-p="' + i + '" class="' + (i === st.hal ? 'on' : '') + '">' + i + '</button>';
        tombol += '<button data-p="' + (st.hal + 1) + '"' + (st.hal === hal ? ' disabled' : '') + ' aria-label="Berikutnya">›</button>';
      }
      pager.innerHTML = '<span>Menampilkan ' + dari + '–' + sampai + ' dari ' + App.fmt.angka(n) + (n !== st.data.length ? ' (tersaring dari ' + App.fmt.angka(st.data.length) + ')' : '') + '</span><div class="pg">' + tombol + '</div>';
      if (cfg.onRender) cfg.onRender(d);
    }
    render();
    return { setData: function (d) { st.data = d || []; render(); }, render: render, st: st, terlihat: function () { return st.view; },
      tersaring: function () { var keep = st.view; return st.data.filter(function (r) { if (st.q && teks(r).indexOf(st.q) === -1) return false; for (var k in st.filter) { if (st.filter[k] && cfg.saring && !cfg.saring(r, k, st.filter[k])) return false; } return true; }); } };
  }

  // ------------------------------------------------------------------ GRAFIK SVG
  var WARNA = ['#0F3B67', '#F2A900', '#2563EB', '#16A34A', '#DC2626', '#7C3AED', '#0891B2', '#D97706'];
  function skala(max) { if (max <= 5) return 5; var p = Math.pow(10, Math.floor(Math.log10(max))), n = max / p; return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  var Chart = {
    WARNA: WARNA,
    /** batang vertikal: { label: [], seri: [{ nama, data: [], warna }], tinggi } */
    batang: function (el, o) {
      var W = 640, H = o.tinggi || 220, pl = 34, pb = 26, pt = 10, n = o.label.length, s = o.seri.length;
      var max = skala(Math.max.apply(null, [1].concat.apply([], o.seri.map(function (x) { return x.data; }))));
      var gw = (W - pl) / n, bw = Math.min(28, (gw * 0.7) / s);
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.judul || 'Grafik') + '">';
      for (var g = 0; g <= 4; g++) { var y = pt + (H - pt - pb) * (1 - g / 4); svg += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-width="1"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + App.fmt.angka(max * g / 4) + '</text>'; }
      o.label.forEach(function (l, i) {
        var x0 = pl + gw * i + (gw - bw * s) / 2;
        o.seri.forEach(function (se, j) {
          var v = Number(se.data[i]) || 0, h = (H - pt - pb) * v / max;
          svg += '<rect x="' + (x0 + j * bw) + '" y="' + (H - pb - h) + '" width="' + (bw - 2) + '" height="' + h + '" rx="3" fill="' + (se.warna || WARNA[j]) + '"><title>' + esc(se.nama + ' ' + l + ': ' + v) + '</title></rect>';
        });
        svg += '<text x="' + (pl + gw * i + gw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + '</text>';
      });
      el.innerHTML = '<div class="chart">' + svg + '</svg></div>' + (s > 1 ? '<div class="legend">' + o.seri.map(function (se, j) { return '<span><i style="background:' + (se.warna || WARNA[j]) + '"></i>' + esc(se.nama) + '</span>'; }).join('') + '</div>' : '');
    },
    garis: function (el, o) {
      var W = 640, H = o.tinggi || 220, pl = 34, pb = 26, pt = 10, n = o.label.length;
      var max = skala(Math.max.apply(null, [1].concat.apply([], o.seri.map(function (x) { return x.data; }))));
      var X = function (i) { return pl + (W - pl - 10) * (n === 1 ? 0.5 : i / (n - 1)); }, Y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.judul || 'Grafik') + '">';
      for (var g = 0; g <= 4; g++) { var y = Y(max * g / 4); svg += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + App.fmt.angka(max * g / 4) + '</text>'; }
      o.seri.forEach(function (se, j) {
        var c = se.warna || WARNA[j], pts = se.data.map(function (v, i) { return X(i) + ',' + Y(Number(v) || 0); }).join(' ');
        svg += '<polyline points="' + pts + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linejoin="round"/>';
        se.data.forEach(function (v, i) { svg += '<circle cx="' + X(i) + '" cy="' + Y(Number(v) || 0) + '" r="3.5" fill="' + c + '"><title>' + esc(o.label[i] + ': ' + v) + '</title></circle>'; });
      });
      o.label.forEach(function (l, i) { if (n <= 12 || i % 2 === 0) svg += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + '</text>'; });
      el.innerHTML = '<div class="chart">' + svg + '</svg></div>';
    },
    /** batang horizontal: { item: [{ l, n, warna }] } */
    batangH: function (el, o) {
      var max = Math.max.apply(null, [1].concat(o.item.map(function (x) { return x.n; })));
      el.innerHTML = o.item.length ? o.item.map(function (x, i) {
        return '<div style="margin:10px 0"><div class="row between small"><span>' + esc(x.l) + '</span><b class="mono">' + App.fmt.angka(x.n) + '</b></div>' +
          '<div style="height:10px;background:var(--line);border-radius:6px;overflow:hidden;margin-top:4px"><i style="display:block;height:100%;width:' + (x.n / max * 100) + '%;background:' + (x.warna || WARNA[0]) + ';border-radius:6px"></i></div></div>';
      }).join('') : '<div class="kosong small">Belum ada data.</div>';
    },
    donat: function (el, o) {
      var tot = o.item.reduce(function (s, x) { return s + x.n; }, 0), a = -Math.PI / 2, svg = '<svg viewBox="0 0 120 120" style="max-width:160px">';
      if (!tot) svg += '<circle cx="60" cy="60" r="46" fill="none" stroke="var(--line)" stroke-width="18"/>';
      o.item.forEach(function (x, i) {
        if (!x.n) return; var b = a + 2 * Math.PI * x.n / tot, besar = b - a > Math.PI ? 1 : 0;
        if (x.n === tot) { svg += '<circle cx="60" cy="60" r="46" fill="none" stroke="' + (x.warna || WARNA[i]) + '" stroke-width="18"/>'; }
        else svg += '<path d="M' + (60 + 46 * Math.cos(a)) + ' ' + (60 + 46 * Math.sin(a)) + ' A46 46 0 ' + besar + ' 1 ' + (60 + 46 * Math.cos(b)) + ' ' + (60 + 46 * Math.sin(b)) + '" fill="none" stroke="' + (x.warna || WARNA[i]) + '" stroke-width="18"><title>' + esc(x.l + ': ' + x.n) + '</title></path>';
        a = b;
      });
      svg += '<text x="60" y="58" text-anchor="middle" style="font-size:20px;font-weight:700;fill:var(--ink)">' + App.fmt.angka(tot) + '</text><text x="60" y="74" text-anchor="middle">' + esc(o.satuan || 'total') + '</text></svg>';
      el.innerHTML = '<div class="row" style="gap:20px;flex-wrap:wrap"><div class="chart" style="width:160px">' + svg + '</div><div class="legend" style="flex-direction:column;gap:6px">' +
        o.item.map(function (x, i) { return '<span><i style="background:' + (x.warna || WARNA[i]) + '"></i>' + esc(x.l) + ' — <b class="mono">' + x.n + '</b></span>'; }).join('') + '</div></div>';
    }
  };

  // ------------------------------------------------------------------ KERANGKA MUAT
  var sk = {
    kartu: function (n) { var s = ''; for (var i = 0; i < (n || 4); i++) s += '<div class="card stat"><div class="sk sk-line" style="width:60%"></div><div class="sk sk-big"></div><div class="sk sk-line" style="width:40%"></div></div>'; return s; },
    baris: function (n) { var s = ''; for (var i = 0; i < (n || 6); i++) s += '<div class="sk sk-line" style="width:' + (60 + (i * 37) % 40) + '%"></div>'; return '<div class="card-b">' + s + '</div>'; },
    halaman: function () { return '<div class="ph"><div><div class="sk sk-line" style="width:120px"></div><div class="sk sk-big" style="width:320px"></div></div></div><div class="grid g4">' + sk.kartu(4) + '</div><div class="card" style="margin-top:16px">' + sk.baris(8) + '</div>'; }
  };

  // ------------------------------------------------------------------ FORM
  var Form = {
    data: function (form) {
      var o = {};
      $$('input,select,textarea', form).forEach(function (f) {
        if (!f.name) return;
        if (f.type === 'checkbox') { if (f.name.slice(-2) === '[]') { var n = f.name.slice(0, -2); o[n] = o[n] || []; if (f.checked) o[n].push(f.value); } else o[f.name] = f.checked; }
        else if (f.type === 'radio') { if (f.checked) o[f.name] = f.value; else if (!(f.name in o)) o[f.name] = ''; }
        else o[f.name] = f.value.trim();
      });
      return o;
    },
    isi: function (form, o) {
      $$('input,select,textarea', form).forEach(function (f) {
        if (!f.name) return;
        var n = f.name.replace(/\[\]$/, ''), v = o[n];
        if (v === undefined) return;
        if (f.type === 'checkbox') f.checked = Array.isArray(v) ? v.indexOf(f.value) > -1 : !!v && v !== 'TIDAK';
        else if (f.type === 'radio') f.checked = String(v) === f.value;
        else f.value = v === null ? '' : v;
      });
    },
    wajib: function (form) {
      var ok = true;
      $$('[required]', form).forEach(function (f) { var kosong = !String(f.value || '').trim(); f.classList.toggle('invalid', kosong); if (kosong && ok) { ok = false; f.focus(); } });
      if (!ok) App.toast('Lengkapi isian bertanda *.', 'warn');
      return ok;
    },
    muat: function (btn, p) { btn.classList.add('loading'); btn.disabled = true; return p.then(function (x) { btn.classList.remove('loading'); btn.disabled = false; return x; }, function (e) { btn.classList.remove('loading'); btn.disabled = false; throw e; }); },
    /**
     * bangun(fields, data) — form dari definisi. field: { k, l, t, wajib, hint, full, ph, maks, mono, ro, opsi, kosong, terima, rows, min, max, atr }
     * t: text (bawaan) | email | number | date | datetime-local | time | textarea | select | seg | switch | berkas | hidden | html
     * switch → dikirim 'YA'/'TIDAK' lewat ambil(); berkas → input tersembunyi berisi URL + tombol unggah (pasang dengan pasangUnggah).
     */
    bangun: function (fields, d) {
      d = d || {};
      return '<div class="form-grid">' + fields.map(function (f) {
        var v = d[f.k] === undefined || d[f.k] === null ? (f.awal === undefined ? '' : f.awal) : d[f.k], t = f.t || 'text';
        var lbl = f.l ? '<label' + (t === 'switch' ? ' class="hide"' : '') + '>' + esc(f.l) + (f.wajib ? ' <span class="req">*</span>' : '') + '</label>' : '';
        var atr = (f.wajib ? ' required' : '') + (f.ro ? ' readonly' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.maks ? ' maxlength="' + f.maks + '"' : '') + (f.atr || '');
        var isi;
        if (t === 'hidden') return '<input type="hidden" name="' + f.k + '" value="' + esc(v) + '">';
        if (t === 'html') return '<div class="' + (f.full ? 'full' : '') + '">' + f.html + '</div>';
        if (t === 'textarea') isi = '<textarea class="ta" name="' + f.k + '" rows="' + (f.rows || 4) + '"' + atr + '>' + esc(v) + '</textarea>';
        else if (t === 'select') isi = '<select class="sel" name="' + f.k + '"' + atr + '>' + Form.opsi(f.opsi || [], v, f.kosong) + '</select>';
        else if (t === 'seg') isi = '<div class="seg">' + (f.opsi || []).map(function (o) { var ov = typeof o === 'object' ? o.v : o, ol = typeof o === 'object' ? o.l : o; return '<label><input type="radio" name="' + f.k + '" value="' + esc(ov) + '"' + (String(v) === String(ov) ? ' checked' : '') + '>' + esc(ol) + '</label>'; }).join('') + '</div>';
        else if (t === 'switch') isi = '<label class="switch"><input type="checkbox" name="' + f.k + '" data-yt' + (v === true || /^(ya|true|1|aktif)$/i.test(String(v)) ? ' checked' : '') + '><span>' + esc(f.l) + '</span></label>';
        else if (t === 'berkas') {
          var gbr = f.terima !== 'pdf';
          isi = '<input type="hidden" name="' + f.k + '" value="' + esc(v) + '"><div class="row wrap-row" data-prev="' + f.k + '">' +
            (gbr ? '<img src="' + esc(v) + '" alt="" referrerpolicy="no-referrer" style="width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid var(--line);background:var(--bg)' + (v ? '' : ';display:none') + '">' : '<a href="' + esc(v) + '" target="_blank" rel="noopener" class="small"' + (v ? '' : ' style="display:none"') + '>' + ikon('description') + 'Lihat berkas</a>') +
            '<label class="btn btn-outline btn-sm">' + ikon('upload') + '<span>' + (gbr ? 'Unggah gambar' : 'Unggah PDF') + '</span><input type="file" hidden data-unggah="' + f.k + '" accept="' + (gbr ? 'image/jpeg,image/png,image/webp' : 'application/pdf') + '"></label>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-kosongkan="' + f.k + '"' + (v ? '' : ' style="display:none"') + '>Hapus</button></div>';
        }
        else isi = '<input class="inp' + (f.mono ? ' mono' : '') + '" type="' + t + '" name="' + f.k + '" value="' + esc(v) + '"' + atr + (f.min !== undefined ? ' min="' + f.min + '"' : '') + (f.max !== undefined ? ' max="' + f.max + '"' : '') + '>';
        return '<div class="field' + (f.full || t === 'textarea' || t === 'berkas' ? ' full' : '') + '">' + lbl + isi + (f.hint ? '<div class="hint">' + f.hint + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    },
    /** ambil(form) — seperti data(), tetapi saklar [data-yt] dikirim sebagai 'YA'/'TIDAK'. */
    ambil: function (form) {
      var o = Form.data(form);
      $$('input[data-yt]', form).forEach(function (c) { o[c.name] = c.checked ? 'YA' : 'TIDAK'; });
      return o;
    },
    /** pasangUnggah(form, fn(file, jenis) → Promise<url>) — mengikat tombol unggah pada field berkas. */
    pasangUnggah: function (form, fn) {
      $$('input[data-unggah]', form).forEach(function (inp) {
        var k = inp.dataset.unggah, wadah = form.querySelector('[data-prev="' + k + '"]'), tbl = inp.closest('label');
        inp.onchange = function () {
          var file = inp.files[0]; if (!file) return;
          // Penanda unggahan berjalan: tombol Simpan menunggu sampai selesai (1.3.5).
          var tulisan = tbl.querySelector('span:not(.ms)'), awal = tulisan.textContent;
          var selesai = function () { tbl.classList.remove('loading'); tulisan.textContent = awal; form.dataset.mengunggah = Math.max(0, (+form.dataset.mengunggah || 0) - 1); };
          tbl.classList.add('loading'); tulisan.textContent = 'Mengunggah…'; form.dataset.mengunggah = (+form.dataset.mengunggah || 0) + 1;
          fn(file, /pdf/.test(inp.accept) ? 'pdf' : 'gambar').then(function (url) {
            selesai(); form.querySelector('input[name="' + k + '"]').value = url;
            var img = wadah.querySelector('img'), a = wadah.querySelector('a');
            if (img) { img.src = url; img.style.display = ''; } if (a) { a.href = url; a.style.display = ''; }
            wadah.querySelector('[data-kosongkan]').style.display = ''; App.toast('Berkas terunggah.', 'ok');
          }, function (e) { selesai(); App.toast(e.message, 'bad'); });
          inp.value = '';
        };
        var hapus = wadah.querySelector('[data-kosongkan]');
        hapus.onclick = function () {
          form.querySelector('input[name="' + k + '"]').value = ''; hapus.style.display = 'none';
          var img = wadah.querySelector('img'), a = wadah.querySelector('a'); if (img) img.style.display = 'none'; if (a) a.style.display = 'none';
        };
      });
    },
    // Nilai tersimpan yang tidak ada di daftar tetap dipertahankan sebagai pilihan (bukan diam-diam diganti pilihan pertama saat disimpan).
    opsi: function (list, pilih, kosong) {
      var ada = pilih == null || String(pilih) === '' || list.some(function (x) { return String(typeof x === 'object' ? x.v : x) === String(pilih); });
      return (kosong ? '<option value="">' + esc(kosong) + '</option>' : '') + list.map(function (x) { var v = typeof x === 'object' ? x.v : x, l = typeof x === 'object' ? x.l : x; return '<option value="' + esc(v) + '"' + (String(v) === String(pilih) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') +
        (ada ? '' : '<option value="' + esc(pilih) + '" selected>' + esc(pilih) + ' (tidak ada di daftar)</option>');
    }
  };

  // ------------------------------------------------------------------ PETA (Leaflet, dimuat saat dibutuhkan)
  var Peta = {
    p: null,
    muat: function () {
      if (window.L) return Promise.resolve(window.L);
      if (this.p) return this.p;
      this.p = new Promise(function (res, rej) {
        var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
        var s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = function () { res(window.L); }; s.onerror = function () { rej(new Error('Peta tidak dapat dimuat (periksa koneksi).')); };
        document.head.appendChild(s);
      });
      return this.p;
    },
    buat: function (el, lat, lng, zoom) {
      return Peta.muat().then(function (L) {
        var m = L.map(el, { scrollWheelZoom: false }).setView([lat || -1.2420, lng || 116.8940], zoom || 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
        return m;
      });
    }
  };

  function qrUrl(teks, ukuran) { return 'https://api.qrserver.com/v1/create-qr-code/?size=' + (ukuran || 180) + 'x' + (ukuran || 180) + '&margin=0&data=' + encodeURIComponent(teks || ''); }

  // ------------------------------------------------------------------ CETAK
  var Cetak = {
    /** html: isi kertas; ukuran: 'A4' | 'A5 landscape' */
    jalankan: function (html, ukuran) {
      var box = document.getElementById('cetak');
      if (!box) { box = document.createElement('div'); box.id = 'cetak'; document.body.appendChild(box); }
      var gaya = document.getElementById('gaya-cetak');
      if (!gaya) { gaya = document.createElement('style'); gaya.id = 'gaya-cetak'; document.head.appendChild(gaya); }
      gaya.textContent = '@page { size: ' + (ukuran || 'A4') + '; margin: ' + (/A5/.test(ukuran || '') ? '8mm' : '14mm') + '; }';
      box.innerHTML = html;
      document.body.classList.add('mencetak');
      var imgs = $$('img', box), tunggu = imgs.map(function (i) { return i.complete ? Promise.resolve() : new Promise(function (r) { i.onload = i.onerror = r; setTimeout(r, 4000); }); });
      Promise.all(tunggu).then(function () {
        var selesai = function () { document.body.classList.remove('mencetak'); window.removeEventListener('afterprint', selesai); };
        window.addEventListener('afterprint', selesai);
        window.print();
        setTimeout(selesai, 1500);
      });
    }
  };

  window.UI = { tutupSemua: tutupSemua, Modal: Modal, Laci: Laci, Tabel: Tabel, Chart: Chart, sk: sk, Form: Form, Peta: Peta, qrUrl: qrUrl, Cetak: Cetak };
})();
