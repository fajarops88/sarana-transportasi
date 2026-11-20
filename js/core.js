/**
 * core.js — inti bersama semua modul.
 *  - api(): fetch ke GAS (POST text/plain), dedupe baca + epoch tulis, batas waktu 90 dtk
 *  - apiQ(): penggabung batch otomatis (aksi baca di tik yang sama → 1 eksekusi server)
 *  - swr(): tampil instan dari localStorage, segarkan di latar bila basi
 *  - Sesi: token 6 jam di localStorage, peringatan sebelum habis
 *  - Perf.table(): ukuran waktu per panggilan (console)
 *  - util: esc, fmt, plat nomor, badge, toast, kompres foto, ekspor .xlsx
 *  - Logo: logo unggahan dari Panel Konten menggantikan icons/logo.svg di semua halaman (tanpa ubah berkas)
 */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var VERSI = window.APP_VERSI || '0';
  var ROOT = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? new URL('..', s).href : location.origin + '/';
  })();

  // ------------------------------------------------------------------ util
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var BLN_P = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function tglObj(s) { if (!s) return null; s = String(s); var d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00+08:00' : s); return isNaN(d) ? null : d; }
  function wita(d) { return new Date(d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60000); }
  var fmt = {
    tgl: function (s) { var d = tglObj(s); if (!d) return s ? esc(s) : '—'; d = wita(d); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); },
    tglP: function (s) { var d = tglObj(s); if (!d) return '—'; d = wita(d); return d.getDate() + ' ' + BLN_P[d.getMonth()] + ' ' + d.getFullYear(); },
    jam: function (s) { var d = tglObj(s); if (!d) return ''; d = wita(d); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' WITA'; },
    tglJam: function (s) { return s && String(s).length > 10 ? fmt.tgl(s) + ', ' + fmt.jam(s) : fmt.tgl(s); },
    bulan: function (ym) { var p = String(ym).split('-'); return BLN[Number(p[1]) - 1] + ' ' + String(p[0]).slice(2); },
    angka: function (n) { return Number(n || 0).toLocaleString('id-ID'); },
    hariIni: function () { var d = wita(new Date()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    relatif: function (s) {
      var d = tglObj(s); if (!d) return ''; var m = Math.round((Date.now() - d.getTime()) / 60000);
      if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu'; if (m < 1440) return Math.round(m / 60) + ' jam lalu'; return Math.round(m / 1440) + ' hari lalu';
    },
    BLN: BLN, BLN_P: BLN_P
  };
  function plat(nopol, umum) { return '<span class="plate' + (umum ? ' umum' : '') + '">' + esc(nopol || '—') + '</span>'; }
  var BADGE = {
    'AKTIF': 'b-ok dot', 'TIDAK AKTIF': 'b-bad dot', 'DIBLOKIR': 'b-crit',
    'Diterima': 'b-info', 'Diproses': 'b-warn', 'Selesai': 'b-ok', 'Baru': 'b-info',
    'Draft': 'b-slate', 'Terbit': 'b-info', 'Tindak Lanjut': 'b-warn', 'Dibatalkan': 'b-bad strike',
    'Aktif': 'b-ok', 'Nonaktif': 'b-slate', 'Tayang': 'b-ok', 'YA': 'b-ok', 'TIDAK': 'b-slate',
    'Teguran Lisan': 'b-slate', 'Teguran Tertulis': 'b-warn', 'Penghentian Sementara Kegiatan': 'b-orange', 'Penghentian Tetap Kegiatan': 'b-bad', 'Pencabutan Izin': 'b-crit'
  };
  function badge(s, extra) {
    var kunci = String(s || '');
    var ikon = kunci === 'DIBLOKIR' || /Penghentian|Pencabutan/.test(kunci) ? '<span class="ms">lock</span>' : '';
    return '<span class="badge ' + (BADGE[kunci] || 'b-slate') + (extra ? ' ' + extra : '') + '">' + ikon + esc(kunci || '—') + '</span>';
  }
  function ikon(n, cls) { return '<span class="ms' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + n + '</span>'; }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
  function hashStr(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function q(key) { var h = location.hash.split('?')[1] || ''; return new URLSearchParams(h).get(key) || new URLSearchParams(location.search).get(key) || ''; }

  // ------------------------------------------------------------------ ikon siap
  (function () {
    var root = document.documentElement, ok = false, siap = function () { ok = true; root.classList.add('ikon-siap'); };
    // Font ikon gagal dimuat (offline/diblokir): sembunyikan teks ligatur, kecuali tombol ikon-saja.
    setTimeout(function () { if (!ok) root.classList.add('ikon-siap', 'ikon-gagal'); }, 4000);
    if (document.fonts && document.fonts.load) {
      document.fonts.load('24px "Material Symbols Outlined"').then(function (l) { if (l && l.length) siap(); });
      document.fonts.ready.then(function () { if (document.fonts.check('24px "Material Symbols Outlined"')) siap(); });
    }
  })();

  // ------------------------------------------------------------------ toast
  function toast(pesan, jenis, ms) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var ic = { ok: 'check_circle', bad: 'error', warn: 'warning', info: 'info' }[jenis || 'info'];
    var el = document.createElement('div');
    el.className = 'toast ' + (jenis || 'info');
    el.innerHTML = ikon(ic) + '<div>' + esc(pesan) + '</div>';
    box.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 320); }, ms || (jenis === 'bad' ? 6000 : 3200));
  }

  // ------------------------------------------------------------------ sesi
  var Sesi = {
    KEY: 'sesi_v1',
    get: function () { try { var s = JSON.parse(localStorage.getItem(this.KEY) || 'null'); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } },
    simpan: function (d) { localStorage.setItem(this.KEY, JSON.stringify({ token: d.token, exp: d.exp, me: d.me })); },
    hapus: function () { localStorage.removeItem(this.KEY); },
    token: function () { var s = this.get(); return s ? s.token : ''; },
    me: function () { var s = this.get(); return s ? s.me : null; },
    sisaMs: function () { var s = this.get(); return s ? s.exp - Date.now() : 0; },
    ke: function (role) {
      return ({ 'Superadmin': 'simau/', 'Admin Konten': 'konten/', 'Admin Angkutan': 'simau/', 'Petugas Angkutan': 'simau/', 'Admin ETLE': 'etle/', 'Petugas Lapangan': 'etle/' })[role] || '';
    },
    habis: function (pesan) {
      this.hapus();
      try { sessionStorage.setItem('pesan_masuk', pesan || 'Sesi Anda berakhir. Silakan masuk lagi.'); } catch (e) {}
      location.href = ROOT + '#/masuk?ke=' + encodeURIComponent(location.href);
    },
    _diingatkan: false,
    pantau: function () {
      var self = this;
      setInterval(function () {
        var s = self.sisaMs();
        if (!self.get()) { self.habis('Sesi 6 jam Anda berakhir. Silakan masuk lagi; draf yang tersimpan tidak hilang.'); return; }
        if (s < 15 * 60000 && !self._diingatkan) { self._diingatkan = true; toast('Sesi berakhir dalam ' + Math.ceil(s / 60000) + ' menit. Simpan pekerjaan Anda.', 'warn', 8000); }
      }, 60000);
    }
  };

  // ------------------------------------------------------------------ pengukur
  var Perf = {
    log: [],
    add: function (o) { this.log.push(o); if (this.log.length > 300) this.log.shift(); },
    table: function () { console.table(this.log.map(function (x) { return { aksi: x.a, total_ms: x.t, server_ms: x.s, jaringan_ms: x.t - (x.s || 0), cache: x.c ? '✓' : '' }; })); },
    summary: function () {
      var m = {}; this.log.forEach(function (x) { var k = x.a; m[k] = m[k] || { aksi: k, n: 0, total: 0, server: 0, cache: 0 }; m[k].n++; m[k].total += x.t; m[k].server += x.s || 0; if (x.c) m[k].cache++; });
      console.table(Object.keys(m).map(function (k) { var o = m[k]; return { aksi: k, kali: o.n, rata_total: Math.round(o.total / o.n), rata_server: Math.round(o.server / o.n), dari_cache: o.cache }; }));
    }
  };

  // ------------------------------------------------------------------ versi server
  var Versi = {
    server: '',
    lihat: function (v) {
      if (!v || v === this.server) return;
      this.server = v;
      if (v !== VERSI) document.dispatchEvent(new CustomEvent('versi-beda', { detail: { app: VERSI, server: v } }));
    }
  };

  // ------------------------------------------------------------------ logo unggahan (Panel Konten → Logo)
  // Logo disimpan di perangkat (localStorage). Setiap jawaban server membawa versi logo (lv); bila berbeda,
  // logo baru diambil SEKALI lewat publik.logo. Gambar bawaan icons/logo.svg & favicon diganti otomatis.
  var Logo = {
    K: 'sarpras_logo_v1', d: null, ambil: null, BAWAAN: /icons\/logo\.svg(\?.*)?$/,
    data: function () { if (this.d) return this.d; try { this.d = JSON.parse(localStorage.getItem(this.K) || 'null') || {}; } catch (e) { this.d = {}; } return this.d; },
    kiri: function () { return this.data().kiri || ''; },
    kanan: function () { return this.data().kanan || ''; },
    simpan: function (o) {
      this.d = o && o.ver ? o : {};
      try { if (o && o.ver) localStorage.setItem(this.K, JSON.stringify(o)); else localStorage.removeItem(this.K); } catch (e) {}
      this.terapkan(document);
      document.dispatchEvent(new CustomEvent('logo-berubah'));
    },
    /** Ganti src/href gambar logo bawaan di dalam akar (atau akar itu sendiri). */
    terapkan: function (akar) {
      var u = this.kiri(), self = this;
      var els = (akar.matches && akar.matches('img,link') ? [akar] : []).concat($$('img,link[rel~="icon"]', akar));
      els.forEach(function (el) {
        if (el.hasAttribute('data-logo-tetap')) return;              // pratinjau di halaman Logo: jangan diganti
        var atr = el.tagName === 'LINK' ? 'href' : 'src', asli = el.getAttribute('data-logo-asli');
        if (u) {
          if (asli === null) { if (!self.BAWAAN.test(el.getAttribute(atr) || '')) return; el.setAttribute('data-logo-asli', el.getAttribute(atr)); }
          if (el.getAttribute(atr) !== u) {
            el.setAttribute(atr, u);
            if (atr === 'href') el.removeAttribute('type'); else el.style.objectFit = 'contain';
          }
        } else if (asli !== null) { el.setAttribute(atr, asli); el.removeAttribute('data-logo-asli'); }
      });
    },
    lihat: function (lv) {
      if (lv === undefined || lv === null) return;                 // backend lama: tidak membawa versi logo
      var self = this; lv = String(lv);
      setTimeout(function () {                                     // beri kesempatan penyimpan logo menulis versinya dulu
        if (lv === String(self.data().ver || '') || self.ambil) return;
        if (!lv) { if (self.data().ver) self.simpan(null); return; }
        self.ambil = api('publik.logo', {}).then(function (d) {
          self.ambil = null; self.simpan({ ver: d.ver || lv, kiri: d.kiri || '', kanan: d.kanan || '' });
        }, function () { self.ambil = null; });
      }, 0);
    }
  };

  // ------------------------------------------------------------------ API
  var WRITE = /(\.simpan|\.hapus|\.selesai|\.update|\.upload|\.foto$|fotoHapus|hapusDraft|terbitkan|\.tindak|\.koreksi|\.batal|\.reset|\.jalankan|logout|google|darurat|publik\.pengaduan|surveiKirim|rotasi|cadangan|\.kontak)$/;
  var writeEpoch = 0, inflight = {};
  function ApiError(pesan, kode) { var e = new Error(pesan); e.kode = kode; return e; }

  function urlGas() {
    var u = CFG.GAS_URL || '';
    if (!u || /GANTI|XXXX/.test(u)) throw ApiError('Konfigurasi belum lengkap: isi GAS_URL di js/config.js.', 'CONFIG');
    return u;
  }

  function kirim(body, label) {
    var t0 = performance.now(), ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 90000);
    var server = document.querySelector('.server');
    return fetch(urlGas(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctrl.signal, redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw ApiError('Server menjawab ' + r.status + '. Coba lagi.', 'HTTP'); return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        var t = Math.round(performance.now() - t0);
        Perf.add({ a: label, t: t, s: j.ms, c: !!j.cached });
        Versi.lihat(j.v);
        Logo.lihat(j.lv);
        if (server) { server.className = 'server' + (t > 6000 ? ' slow' : ''); server.textContent = t > 6000 ? 'Server lambat' : 'Server aktif'; }
        return j;
      })
      .catch(function (e) {
        clearTimeout(timer);
        if (server) { server.className = 'server off'; server.textContent = 'Server tidak terjangkau'; }
        if (e.kode) throw e;
        if (e.name === 'AbortError') throw ApiError('Server terlalu lama menjawab (90 detik). Periksa sinyal lalu coba lagi.', 'TIMEOUT');
        throw ApiError(navigator.onLine === false ? 'Tidak ada koneksi internet.' : 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.', 'NET');
      });
  }

  function cekJawaban(j, action) {
    if (j.ok) return j.data;
    if (j.code === 'AUTH' && Sesi.get()) { Sesi.habis(j.message); }
    throw ApiError(j.message || 'Terjadi kesalahan.', j.code);
  }

  /** Panggil satu aksi. opts.fresh = abaikan cache server. */
  function api(action, data, opts) {
    data = Object.assign({}, data || {});
    if (opts && opts.fresh) data._fresh = true;
    var isWrite = WRITE.test(action);
    if (isWrite) { writeEpoch++; return kirim({ action: action, data: data, token: Sesi.token() }, action).then(function (j) { return cekJawaban(j, action); }); }
    var k = writeEpoch + '|' + action + '|' + JSON.stringify(data);
    if (inflight[k]) return inflight[k];
    var p = kirim({ action: action, data: data, token: Sesi.token() }, action).then(function (j) { return cekJawaban(j, action); });
    inflight[k] = p;
    p.then(function () { delete inflight[k]; }, function () { delete inflight[k]; });
    return p;
  }

  /** Penggabung batch: aksi baca di tik yang sama digabung (≤10) menjadi 1 eksekusi server. */
  var Batcher = {
    q: null,
    add: function (action, data) {
      var self = this;
      if (WRITE.test(action)) return api(action, data);
      return new Promise(function (res, rej) {
        if (!self.q) { self.q = []; setTimeout(function () { self.flush(); }, 0); }
        self.q.push({ action: action, data: data || {}, res: res, rej: rej });
      });
    },
    flush: function () {
      var antre = this.q; this.q = null;
      var unik = {}, list = [];
      antre.forEach(function (x) { var k = x.action + '|' + JSON.stringify(x.data); if (!unik[k]) { unik[k] = { action: x.action, data: x.data, ikut: [] }; list.push(unik[k]); } unik[k].ikut.push(x); });
      for (var i = 0; i < list.length; i += 10) (function (bagian) {
        if (bagian.length === 1) { var b = bagian[0]; api(b.action, b.data).then(function (d) { b.ikut.forEach(function (x) { x.res(d); }); }, function (e) { b.ikut.forEach(function (x) { x.rej(e); }); }); return; }
        kirim({ action: 'batch', token: Sesi.token(), data: { calls: bagian.map(function (b) { return { action: b.action, data: b.data }; }) } }, 'batch[' + bagian.map(function (b) { return b.action; }).join(',') + ']')
          .then(function (j) {
            if (!j.ok) throw ApiError(j.message, j.code);
            bagian.forEach(function (b, idx) {
              var r = j.data[idx];
              try { var d = cekJawaban(r, b.action); b.ikut.forEach(function (x) { x.res(d); }); } catch (e) { b.ikut.forEach(function (x) { x.rej(e); }); }
            });
          })
          .catch(function (e) { bagian.forEach(function (b) { b.ikut.forEach(function (x) { x.rej(e); }); }); });
      })(list.slice(i, i + 10));
    }
  };
  function apiQ(action, data) { return Batcher.add(action, data); }

  // ------------------------------------------------------------------ SWR (localStorage)
  var Simpan = {
    ns: function () { var m = Sesi.me(); return 'c1:' + (m ? hashStr(m.email + m.role) : 'pub') + ':'; },
    get: function (k) { try { return JSON.parse(localStorage.getItem(this.ns() + k) || 'null'); } catch (e) { return null; } },
    set: function (k, d) { try { localStorage.setItem(this.ns() + k, JSON.stringify({ t: Date.now(), d: d, h: hashStr(JSON.stringify(d)) })); } catch (e) { this.bersihkan(); } },
    bersihkan: function () { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('c1:') === 0) localStorage.removeItem(k); }); },
    hapus: function (awalan) { var ns = this.ns(); Object.keys(localStorage).forEach(function (k) { if (k.indexOf(ns + (awalan || '')) === 0) localStorage.removeItem(k); }); }
  };

  /**
   * swr(action, data, { maxAge (ms), onData(data, dariCache), fresh })
   * Menampilkan data simpanan seketika, lalu mengambil dari server bila basi atau fresh.
   */
  function swr(action, data, o) {
    o = o || {};
    var key = action + ':' + hashStr(JSON.stringify(data || {}));
    var c = Simpan.get(key), maxAge = o.maxAge === undefined ? 30000 : o.maxAge;
    if (c && o.onData) o.onData(c.d, true);
    if (c && !o.fresh && Date.now() - c.t < maxAge) return Promise.resolve(c.d);
    return apiQ(action, Object.assign({}, data || {}, o.fresh ? { _fresh: true } : {})).then(function (d) {
      var h = hashStr(JSON.stringify(d));
      Simpan.set(key, d);
      if (o.onData && (!c || c.h !== h)) o.onData(d, false);
      return d;
    }, function (e) { if (c) { if (o.onError) o.onError(e); return c.d; } throw e; });
  }

  // ------------------------------------------------------------------ pemanasan server
  function warmUp(scope) {
    try {
      var k = 'warm_' + scope, last = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - last < 240000) return;
      sessionStorage.setItem(k, String(Date.now()));
      var u = urlGas();
      fetch(u + (u.indexOf('?') > -1 ? '&' : '?') + 'w=' + scope, { mode: 'no-cors', cache: 'no-store' }).catch(function () {});
    } catch (e) {}
  }

  // ------------------------------------------------------------------ foto: kompres di perangkat (≈150–300 KB)
  function kompres(file, maxSisi, targetKb) {
    maxSisi = maxSisi || 1280; targetKb = targetKb || 280;
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) return rej(new Error('Berkas bukan gambar.'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, maxSisi / Math.max(img.width, img.height)), w = Math.round(img.width * s), h = Math.round(img.height * s);
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        var qy = 0.8, out = cv.toDataURL('image/jpeg', qy);
        while (out.length * 0.75 / 1024 > targetKb && qy > 0.4) { qy -= 0.08; out = cv.toDataURL('image/jpeg', qy); }
        res(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Gambar tidak dapat dibaca.')); };
      img.src = url;
    });
  }
  function bacaBerkas(file) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(file); }); }

  // ------------------------------------------------------------------ ekspor .xlsx (zip tanpa kompresi)
  var Xlsx = (function () {
    var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
    function x(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
    function kol(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
    function sheetXml(kolom, baris) {
      var rows = [kolom].concat(baris).map(function (r, ri) {
        return '<row r="' + (ri + 1) + '">' + r.map(function (v, ci) {
          var ref = kol(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : '';
          if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
          return '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + x(v) + '</t></is></c>';
        }).join('') + '</row>';
      }).join('');
      var lebar = kolom.map(function (k, i) { var m = String(k).length; baris.slice(0, 200).forEach(function (r) { m = Math.max(m, String(r[i] === undefined ? '' : r[i]).length); }); return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + Math.min(60, m + 3) + '" customWidth="1"/>'; }).join('');
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' + lebar + '</cols><sheetData>' + rows + '</sheetData></worksheet>';
    }
    function zip(files) {
      var enc = new TextEncoder(), lokal = [], pusat = [], off = 0;
      files.forEach(function (f) {
        var nama = enc.encode(f.n), data = enc.encode(f.d), c = crc32(data);
        var h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
        h.setUint32(14, c, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nama.length, true);
        lokal.push(new Uint8Array(h.buffer), nama, data);
        var p = new DataView(new ArrayBuffer(46));
        p.setUint32(0, 0x02014b50, true); p.setUint16(4, 20, true); p.setUint16(6, 20, true); p.setUint16(8, 0x0800, true);
        p.setUint32(16, c, true); p.setUint32(20, data.length, true); p.setUint32(24, data.length, true); p.setUint16(28, nama.length, true); p.setUint32(42, off, true);
        pusat.push(new Uint8Array(p.buffer), nama);
        off += 30 + nama.length + data.length;
      });
      var ukPusat = pusat.reduce(function (s, a) { return s + a.length; }, 0);
      var e = new DataView(new ArrayBuffer(22));
      e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, ukPusat, true); e.setUint32(16, off, true);
      return new Blob(lokal.concat(pusat, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    /** sheets: [{ nama, kolom: [..], baris: [[..]] }] */
    function buat(sheets) {
      var ws = sheets.map(function (s, i) { return { n: 'xl/worksheets/sheet' + (i + 1) + '.xml', d: sheetXml(s.kolom, s.baris) }; });
      var nm = function (s) { return x(String(s.nama || 'Data').replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31)); };
      return zip([
        { n: '[Content_Types].xml', d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + ws.map(function (w) { return '<Override PartName="/' + w.n + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' },
        { n: '_rels/.rels', d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
        { n: 'xl/workbook.xml', d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map(function (s, i) { return '<sheet name="' + nm(s) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>' },
        { n: 'xl/_rels/workbook.xml.rels', d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
        { n: 'xl/styles.xml', d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F3B67"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>' }
      ].concat(ws));
    }
    function unduh(namaBerkas, sheets) {
      var b = buat(sheets), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = namaBerkas.replace(/\.xlsx$/, '') + '.xlsx';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
    return { buat: buat, unduh: unduh };
  })();

  // ------------------------------------------------------------------ PWA
  // Pasang aplikasi (PWA): pakai jendela pasang bawaan Chrome/Edge bila tersedia; bila tidak (iPhone, atau Chrome
  // belum menawarkan), tampilkan petunjuk langkah demi langkah sesuai perangkat.
  var Pasang = { evt: null };
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); Pasang.evt = e; document.dispatchEvent(new CustomEvent('bisa-pasang')); });
  window.addEventListener('appinstalled', function () { Pasang.evt = null; document.dispatchEvent(new CustomEvent('terpasang')); });
  Pasang.tampilkan = function () { if (!Pasang.evt) return Promise.resolve(false); Pasang.evt.prompt(); return Pasang.evt.userChoice.then(function (c) { Pasang.evt = null; return c.outcome === 'accepted'; }); };
  Pasang.terpasang = function () { return !!((window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: minimal-ui)').matches)) || navigator.standalone === true); };
  Pasang.ios = function () { var u = navigator.userAgent || ''; return /iphone|ipad|ipod/i.test(u) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); };
  Pasang.android = function () { return /android/i.test(navigator.userAgent || ''); };
  Pasang.hp = function () { return Pasang.ios() || Pasang.android() || !!(window.matchMedia && matchMedia('(max-width: 760px)').matches); };
  Pasang.nama = function () { var m = document.querySelector('meta[name="apple-mobile-web-app-title"]'); return (m && m.content) || 'aplikasi ini'; };
  Pasang.mulai = function () {
    if (Pasang.evt) return Pasang.tampilkan().then(function (ok) { if (ok) toast('Aplikasi ' + Pasang.nama() + ' dipasang di perangkat.', 'ok'); return ok; });
    Pasang.petunjuk(); return Promise.resolve(false);
  };
  Pasang.petunjuk = function () {
    var u = navigator.userAgent || '', nama = esc(Pasang.nama()), langkah, catatan = '';
    if (/FBAN|FBAV|Instagram|Line\//.test(u)) {
      langkah = ['Ketuk menu <b>⋮</b> atau <b>…</b> di pojok layar.', 'Pilih <b>Buka di browser</b> (Chrome / Safari).', 'Di browser, buka menu ini lagi lalu ketuk <b>Pasang aplikasi</b>.'];
    } else if (Pasang.ios()) {
      langkah = ['Ketuk tombol <b>Bagikan</b> ' + ikon('ios_share') + ' di bilah bawah (atau atas) Safari.', 'Gulir ke bawah, pilih <b>Tambahkan ke Layar Utama</b>.', 'Ketuk <b>Tambah</b>. Ikon ' + nama + ' muncul di layar utama.'];
      catatan = 'Di iPhone/iPad gunakan Safari. Di Chrome iPhone, tombol Bagikan ada di bilah alamat.';
    } else if (Pasang.android()) {
      langkah = ['Ketuk menu <b>⋮</b> di kanan atas Chrome.', 'Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.', 'Ketuk <b>Instal</b>. Ikon ' + nama + ' muncul di layar utama.'];
      catatan = 'Bila pilihan Instal belum muncul, muat ulang halaman sekali lalu coba lagi.';
    } else {
      langkah = ['Klik ikon <b>Instal</b> ' + ikon('install_desktop') + ' di ujung kanan bilah alamat Chrome/Edge.', 'Atau buka menu <b>⋮</b> → <b>Simpan dan bagikan</b> / <b>Aplikasi</b> → <b>Instal</b>.', 'Aplikasi terbuka di jendela sendiri dan tersedia di menu Start/Dock.'];
    }
    var isi = '<div class="stack"><div class="row" style="gap:12px"><img src="' + ROOT + 'icons/icon-192.png?v=' + VERSI + '" alt="" width="52" height="52" style="border-radius:12px;flex:none"><div class="small">Pasang <b>' + nama + '</b> agar bisa dibuka langsung dari layar utama, seperti aplikasi biasa.</div></div>' +
      '<ol class="pasang-langkah">' + langkah.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' + (catatan ? '<div class="tiny muted">' + catatan + '</div>' : '') + '</div>';
    if (window.UI && UI.Modal) UI.Modal.buka({ judul: 'Pasang aplikasi', isi: isi, tombol: [{ l: 'Mengerti', cls: 'btn-primary' }] });
    else alert(langkah.map(function (x, i) { return (i + 1) + '. ' + x.replace(/<[^>]+>/g, ''); }).join('\n'));
  };
  /** Kartu ajakan pasang (hanya bila belum terpasang). opsi: { kunci, hpSaja, teks } — ditutup = disembunyikan 14 hari. */
  Pasang.kartu = function (el, opsi) {
    opsi = opsi || {};
    if (!el || Pasang.terpasang() || (opsi.hpSaja && !Pasang.hp())) { if (el) el.innerHTML = ''; return; }
    var k = 'pasang_tutup_' + (opsi.kunci || location.pathname);
    try { if (Number(localStorage.getItem(k) || 0) > Date.now()) { el.innerHTML = ''; return; } } catch (e) {}
    el.innerHTML = '<div class="pasang-kartu"><img src="' + ROOT + 'icons/icon-192.png?v=' + VERSI + '" alt="" width="44" height="44"><div class="grow"><b>Pasang aplikasi ' + esc(Pasang.nama()) + '</b><small>' + esc(opsi.teks || 'Buka langsung dari layar utama HP, tanpa mengetik alamat.') + '</small></div>' +
      '<button type="button" class="btn btn-amber btn-sm" data-pasang>' + ikon('install_mobile') + 'Pasang</button><button type="button" class="x" data-tutup aria-label="Tutup">' + ikon('close') + '</button></div>';
    el.querySelector('[data-pasang]').onclick = function () { Pasang.mulai(); };
    el.querySelector('[data-tutup]').onclick = function () { try { localStorage.setItem(k, String(Date.now() + 14 * 864e5)); } catch (e) {} el.innerHTML = ''; };
    document.addEventListener('terpasang', function () { el.innerHTML = ''; }, { once: true });
  };
  function daftarSW(path) {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    navigator.serviceWorker.register(path).catch(function () {});
  }

  // ------------------------------------------------------------------ ekspor global
  window.App = {
    ROOT: ROOT, VERSI: VERSI, CFG: CFG,
    esc: esc, $: $, $$: $$, fmt: fmt, plat: plat, badge: badge, ikon: ikon, debounce: debounce, hashStr: hashStr, q: q,
    toast: toast, Sesi: Sesi, Perf: Perf, Versi: Versi, api: api, apiQ: apiQ, swr: swr, Simpan: Simpan,
    warmUp: warmUp, kompres: kompres, bacaBerkas: bacaBerkas, Xlsx: Xlsx, Pasang: Pasang, daftarSW: daftarSW, Logo: Logo
  };
  window.Perf = Perf;
  // logo unggahan dipasang sejak awal dan pada setiap elemen yang ditambahkan kemudian (header, menu, kop)
  Logo.terapkan(document);
  if (window.MutationObserver) new MutationObserver(function (ms) {
    if (!Logo.kiri()) return;
    ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) Logo.terapkan(n); }); });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
