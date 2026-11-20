/**
 * etle.js — Modul C: ETLE Dishub.
 *  - Petugas Lapangan (atau ?m=1): tampilan HP — Beranda, Catat 3 langkah (draf tersimpan di perangkat,
 *    foto diunggah di latar), Pratinjau → Terbitkan, Surat A4, Kasus saya, Akun.
 *  - Admin ETLE / Superadmin: panel desktop — Dashboard, Semua Kasus, Detail (tindak lanjut, koreksi, batal),
 *    Peta sebaran, Rekap, Master jenis pelanggaran, Pengaturan, Log, Kelola Akun.
 * Prinsip: nopol diketik petugas (tanpa cek database), setelah terbit hanya Admin ETLE yang dapat
 * mengoreksi/membatalkan dengan alasan; nomor surat tidak pernah dipakai ulang.
 */
(function () {
  'use strict';
  var esc = App.esc, ikon = App.ikon, fmt = App.fmt, $ = App.$, $$ = App.$$;
  var sesi = App.Sesi.get(), me = sesi ? sesi.me : {}, PL = 'Petugas Lapangan', ADM = ['Superadmin', 'Admin ETLE'], SA = ['Superadmin'];
  var B = null;
  var SLOT = { depan: 'Plat depan', belakang: 'Plat belakang', uji: 'Bukti uji', tambahan: 'Tambahan' };
  var WARNA = { Draft: '#64748B', Terbit: '#DC2626', 'Tindak Lanjut': '#F2A900', Selesai: '#16A34A', Dibatalkan: '#94A3B8' };

  function boot(cb) { return App.swr('etle.boot', {}, { maxAge: 600000, onData: function (d) { B = d; if (cb) cb(d); } }); }
  function jenisById(id) { return B ? B.jenis.filter(function (j) { return j.id === id; })[0] : null; }
  function galat(e) { return '<div class="card-b"><div class="note bad">' + ikon('error') + '<div>' + esc(e.message || e) + '</div></div></div>'; }
  function nn(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function kop(k) {
    var L = App.Logo.kiri() || App.ROOT + 'icons/logo.svg', R = App.Logo.kanan();
    return '<div class="kop"><img src="' + esc(L) + '" alt="" style="object-fit:contain"><div class="t"><div>PEMERINTAH KOTA BALIKPAPAN</div><b>' + esc(String(k.dinas || '').toUpperCase()) + '</b><div>' + esc(String(k.bidang || '').toUpperCase()) + '</div>' +
      '<small>' + esc([k.alamat, k.telp ? 'Telp. ' + k.telp : ''].filter(String).join(' • ')) + '</small></div>' +
      (R ? '<img src="' + esc(R) + '" alt="" style="object-fit:contain">' : '<img src="' + esc(L) + '" alt="" style="visibility:hidden">') + '</div>';
  }

  // ================================================================== SURAT PENINDAKAN (A4) — dipakai HP & desktop
  var FOTO_CACHE = {};
  function ambilFoto(id, slot) {
    var k = id + '|' + slot; if (FOTO_CACHE[k]) return Promise.resolve(FOTO_CACHE[k]);
    return App.api('etle.fotoGet', { id: id, slot: slot }).then(function (r) { FOTO_CACHE[k] = r.dataUrl; return r.dataUrl; });
  }
  function suratHtml(s, foto) {
    var x = s.kasus;
    var bag = function (judul, isi) { return '<div style="margin-top:10px"><div style="font-weight:700;font-size:12px;letter-spacing:.06em;border-bottom:1px solid #CBD5E1;padding-bottom:3px;margin-bottom:4px">' + judul + '</div>' + isi + '</div>'; };
    var tbl = function (baris) { return '<table class="data">' + baris.map(function (b) { return '<tr><td>' + b[0] + '</td><td>: ' + b[1] + '</td></tr>'; }).join('') + '</table>'; };
    return '<div class="kertas a4">' + kop(s.kop) + '<h2>SURAT PENINDAKAN PELANGGARAN</h2><div class="no">Nomor: ' + esc(x.nomor) + '</div>' +
      bag('I. DATA KENDARAAN', tbl([['Nomor polisi', '<b class="mono" style="font-size:15px">' + esc(x.nopol) + '</b>'], ['Jenis kendaraan', esc(x.jenisKendaraan || '-')], ['Merek / warna', esc(x.merekWarna || '-')], ['Nama pemilik/pengemudi', esc(x.namaPemilik || '-')]])) +
      bag('II. FAKTA PELANGGARAN', tbl([['Dasar hukum', '<b>' + esc(x.pasal || '-') + '</b> Peraturan Daerah Kota Balikpapan Nomor 7 Tahun 2022'], ['Uraian', esc(x.uraian || x.jenis || '-')], ['Waktu kejadian', fmt.tglJam(x.waktu) + ' WITA'],
        ['Lokasi', esc(x.lokasi || '-') + (x.wilayah ? ', ' + esc(x.wilayah) : '')], (x.noBuktiUji ? ['Bukti uji', esc(x.noBuktiUji) + ' (berlaku s.d. ' + fmt.tglP(x.masaBerlakuUji) + ')'] : null)].filter(Boolean))) +
      bag('III. TINDAKAN / SANKSI YANG DIKENAKAN', '<ol style="margin:4px 0 0 18px;font-size:13px">' + x.sanksi.map(function (z) { return '<li>' + esc(z) + '</li>'; }).join('') + '</ol>' + (x.keterangan ? '<p style="font-size:12.5px;margin:6px 0 0"><i>Keterangan petugas:</i> ' + esc(x.keterangan) + '</p>' : '')) +
      (foto && foto.length ? bag('IV. FOTO BUKTI', '<div class="foto-bukti">' + foto.map(function (f) { return '<figure style="margin:0"><img src="' + f.url + '" alt=""><figcaption style="font-size:10px;text-align:center">' + esc(SLOT[f.slot] || f.slot) + '</figcaption></figure>'; }).join('') + '</div>') : '') +
      '<div class="ttd" style="margin-top:16px"><div style="display:flex;gap:10px;align-items:flex-end">' + (s.qr ? '<img src="' + UI.qrUrl(s.qr, 220) + '" alt="QR" style="width:92px;height:92px">' : '') +
      '<div style="font-size:11px;max-width:170px;color:#374151">Pindai untuk memeriksa status surat ini (masukkan juga nomor polisi). Data pribadi tidak ditampilkan.</div></div>' +
      '<div class="k">Petugas penindak<div class="sp"></div><b>' + esc(x.petugas) + '</b></div>' +
      '<div class="k">Balikpapan, ' + fmt.tglP(x.terbit) + '<br>' + esc(s.pejabat.jabatan || 'Pejabat penandatangan') + '<div class="sp"></div><b style="text-decoration:underline">' + esc(s.pejabat.nama || '(...............................)') + '</b><br>' + (s.pejabat.nip ? 'NIP. ' + esc(s.pejabat.nip) : '') + '</div></div>' +
      '<div style="margin-top:12px;font-size:10.5px;color:#64748B;border-top:1px solid #CBD5E1;padding-top:6px">Sarana yang dikenai tindakan dilarang dirusak atau dipindahkan tanpa izin petugas. Penyelesaian di kantor Dinas Perhubungan Kota Balikpapan dengan membawa surat ini. Status: ' + esc(x.status) + '.</div></div>';
  }
  /** suratPanel(el, id, opsi) — muat surat + tombol cetak (dengan/ tanpa foto). */
  function suratPanel(el, id, o) {
    o = o || {};
    el.innerHTML = UI.sk.baris(10);
    var hidup = Shell.hidup ? Shell.hidup() : function () { return true; };
    return App.swr('etle.surat', { id: id }, { maxAge: 60000, onData: function (s) {
      if (!hidup()) return;
      var foto = [];
      el.innerHTML = (o.atas ? o.atas(s) : '') +
        '<div class="row wrap-row" style="margin:12px 0"><button class="btn btn-primary" data-c="cetak">' + ikon('print') + 'Cetak A4</button><label class="chk" style="padding:8px 12px"><input type="checkbox" data-c="foto"' + (s.kasus.foto.length ? '' : ' disabled') + '><span>Sertakan foto bukti (' + s.kasus.foto.length + ')</span></label>' + (o.tombol || '') + '</div>' +
        '<div class="kertas-wrap" data-c="prev">' + suratHtml(s, foto) + '</div>';
      var cb = $('[data-c="foto"]', el), prev = $('[data-c="prev"]', el);
      cb.onchange = function () {
        if (!cb.checked) { foto = []; prev.innerHTML = suratHtml(s, foto); return; }
        cb.disabled = true;
        Promise.all(s.kasus.foto.map(function (f) { return ambilFoto(id, f.slot).then(function (u) { return { slot: f.slot, url: u }; }); }))
          .then(function (l) { foto = l; prev.innerHTML = suratHtml(s, foto); cb.disabled = false; }, function (e) { cb.checked = false; cb.disabled = false; App.toast(e.message, 'bad'); });
      };
      $('[data-c="cetak"]', el).onclick = function () { UI.Cetak.jalankan(suratHtml(s, foto), 'A4'); };
      if (o.selesai) o.selesai(s);
    } }).catch(function (e) { if (hidup()) el.innerHTML = galat(e); });
  }

  // ======================================================================================================
  // TAMPILAN HP — PETUGAS LAPANGAN
  // ======================================================================================================
  function mobile() {
    var KD = 'etle_draf_' + me.email, D = null, FOTO = {}, ST = {}, antri = Promise.resolve(), M = {};
    function bacaD() { try { D = JSON.parse(localStorage.getItem(KD) || 'null'); } catch (e) { D = null; } return D; }
    function simpanD() { if (!D) return; D.diubah = Date.now(); try { localStorage.setItem(KD, JSON.stringify(D)); } catch (e) {} }
    function hapusD() { D = null; FOTO = {}; ST = {}; try { localStorage.removeItem(KD); } catch (e) {} }
    function baru() { D = { id: '', langkah: 1, nopol: '', jenisKendaraan: '', merekWarna: '', namaPemilik: '', wilayah: '', idJenis: '', sanksi: [], keterangan: '', noBuktiUji: '', masaBerlakuUji: '', lokasi: '', lat: '', lng: '', foto: {}, duplikat: [], kotor: true }; FOTO = {}; ST = {}; simpanD(); return D; }
    function baris() { return { id: D.id, nopol: D.nopol, jenisKendaraan: D.jenisKendaraan, merekWarna: D.merekWarna, namaPemilik: D.namaPemilik, wilayah: D.wilayah, idJenis: D.idJenis, sanksi: D.sanksi, keterangan: D.keterangan, lokasi: D.lokasi, lat: D.lat, lng: D.lng, noBuktiUji: D.noBuktiUji, masaBerlakuUji: D.masaBerlakuUji }; }
    /** simpan draf ke server (berurutan agar tidak membuat dua draf). */
    function sinkron(paksa) {
      antri = antri.then(function () {
        if (!D) return null;
        if (D.id && !D.kotor && !paksa) return D.id;
        return App.api('etle.simpan', { row: baris() }).then(function (r) { if (!D) return null; D.id = r.id; D.duplikat = r.duplikat || []; D.kotor = false; simpanD(); return r.id; });
      });
      return antri;
    }

    document.body.innerHTML = '<div class="m-app"><header class="m-top"><a class="logo" href="#/beranda"><img src="' + App.ROOT + 'icons/logo.svg" alt=""></a><div class="grow"><b id="mJudul">ETLE Dishub</b><small>' + esc(me.nama || me.email) + '</small></div>' +
      '<span class="server" style="font-size:11px">Server aktif</span></header><div id="banner"></div><main class="m-body" id="mb"></main><div id="mbar"></div>' +
      '<nav class="m-nav"><div class="in"><a href="#/beranda" data-n="beranda">' + ikon('home') + 'Beranda</a><a href="#/catat" data-n="catat" class="catat"><span class="bulat">' + ikon('add_a_photo') + '</span>Catat</a>' +
      '<a href="#/kasus" data-n="kasus">' + ikon('list_alt') + 'Kasus</a><a href="#/akun" data-n="akun">' + ikon('person') + 'Akun</a></div></nav></div>';
    var MB = $('#mb'), BAR = $('#mbar');
    function judul(t) { $('#mJudul').textContent = t; document.title = t + ' — ETLE Dishub'; }
    function bar(html) { BAR.innerHTML = html ? '<div class="m-bar"><div class="in">' + html + '</div></div>' : ''; MB.style.paddingBottom = html ? '84px' : ''; }

    // ---------------------------------------------------------------- beranda
    function beranda() {
      judul('ETLE Dishub'); bar('');
      var d = bacaD();
      MB.innerHTML = '<div><div class="small muted">Selamat bertugas,</div><h2>' + esc(me.nama || me.email) + '</h2></div>' +
        '<a class="big-cta" href="#/catat?baru=1"><span class="bulat">' + ikon('add_a_photo') + '</span><div><h2>Catat Pelanggaran</h2><p>Kendaraan → Pelanggaran → Bukti & lokasi</p></div></a>' +
        (d && (d.nopol || d.id) ? '<a class="kasus-i" href="#/catat" style="border-color:var(--amber)"><div class="meta"><span class="badge b-amber">Draf belum terbit</span><span>' + fmt.relatif(new Date(d.diubah).toISOString()) + '</span></div><h4>' + esc(d.nopol || '(nopol belum diisi)') + '</h4><div class="small muted">Langkah ' + d.langkah + ' dari 3 · ketuk untuk melanjutkan</div></a>' : '') +
        '<div class="grid g3" id="kpi" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">' + UI.sk.kartu(3) + '</div>' +
        '<div class="row between"><h3>Kasus terbaru saya</h3><a href="#/kasus" class="small">Semua</a></div><div id="baru">' + UI.sk.baris(4) + '</div>';
      App.swr('etle.ringkas', {}, { maxAge: 20000, onData: function (r) {
        if (!$('#kpi')) return;
        $('#kpi').innerHTML = [['Hari ini', r.hariIni.total], ['Terbit', r.hariIni.terbit], ['Draf', r.hariIni.draft]].map(function (x) { return '<div class="card stat" style="padding:12px"><div class="lbl">' + x[0] + '</div><div class="val" style="font-size:26px">' + x[1] + '</div></div>'; }).join('');
        $('#baru').innerHTML = r.terbaru.length ? r.terbaru.map(itemKasus).join('') : '<div class="kosong card">' + ikon('assignment') + '<h4>Belum ada catatan</h4></div>';
      } }).catch(function (e) { if ($('#baru')) $('#baru').innerHTML = galat(e); });
    }
    function itemKasus(k) {
      return '<a class="kasus-i" href="#/kasus/' + encodeURIComponent(k.id) + '"><div class="meta">' + App.badge(k.status) + '<span>' + fmt.tglJam(k.terbit || k.waktu) + '</span></div><h4><span class="mono">' + esc(k.nopol) + '</span> · ' + esc(k.jenis || '(jenis belum dipilih)') + '</h4>' +
        '<div class="small muted">' + esc(k.lokasi || '-') + (k.nomor ? ' · <span class="mono">' + esc(k.nomor) + '</span>' : '') + '</div></a>';
    }

    // ---------------------------------------------------------------- catat (3 langkah)
    function catat(args, q) {
      if (q.get('baru')) { var lama = bacaD(); history.replaceState(null, '', '#/catat'); if (lama && (lama.nopol || lama.id)) { M.tanyaBaru = true; } else baru(); }
      if (!D) bacaD(); if (!D) baru();
      if (M.tanyaBaru) {
        M.tanyaBaru = false;
        UI.Modal.konfirm('Ada draf <b>' + esc(D.nopol || '(tanpa nopol)') + '</b> yang belum terbit. Mulai catatan baru? Draf lama tetap ada di daftar Kasus bila sudah tersimpan ke server.', { judul: 'Draf belum selesai', ok: 'Mulai baru' }).then(function (ok) { if (ok) { baru(); catat(args, new URLSearchParams()); } });
      }
      boot(function () {}).then(function () { langkah(D.langkah || 1); }, function (e) { MB.innerHTML = galat(e); });
      judul('Catat Pelanggaran'); MB.innerHTML = UI.sk.baris(8);
    }
    function steps(n) {
      var L = ['Kendaraan', 'Pelanggaran', 'Bukti & lokasi'];
      return '<div class="card card-b"><div class="steps">' + L.map(function (l, i) { return (i ? '<div class="ln' + (i < n ? ' ok' : '') + '"></div>' : '') + '<div class="st' + (i + 1 === n ? ' on' : i + 1 < n ? ' ok' : '') + '"><b>' + (i + 1 < n ? ikon('check') : i + 1) + '</b>' + l + '</div>'; }).join('') + '</div></div>';
    }
    function langkah(n) {
      if (location.hash.indexOf('#/catat') !== 0) return;
      D.langkah = n; simpanD(); window.scrollTo(0, 0);
      if (n === 1) l1(); else if (n === 2) l2(); else if (n === 3) l3(); else pratinjau();
    }
    function ubah(k, v) { if (D[k] !== v) { D[k] = v; D.kotor = true; simpanD(); } }

    function l1() {
      MB.innerHTML = steps(1) + '<div class="card card-b stack"><h3>' + ikon('directions_car') + ' Identitas kendaraan</h3>' +
        '<div class="field"><label>Nomor polisi <span class="req">*</span></label><input class="inp mono" id="nopol" maxlength="12" autocomplete="off" autocapitalize="characters" style="font-size:22px;letter-spacing:.06em;text-transform:uppercase;height:58px" value="' + esc(D.nopol) + '" placeholder="KT 1234 AB"><div id="riw" class="hint"></div></div>' +
        '<div class="field"><label>Jenis kendaraan <span class="req">*</span></label><div class="chip-grid">' + B.jenisKendaraan.map(function (j) { return '<label><input type="radio" name="jk" value="' + esc(j) + '"' + (D.jenisKendaraan === j ? ' checked' : '') + '>' + esc(j) + '</label>'; }).join('') + '</div></div>' +
        '<div class="field"><label>Merek dan warna</label><input class="inp" id="mw" maxlength="100" value="' + esc(D.merekWarna) + '" placeholder="Hino Ranger, hijau"></div>' +
        '<div class="field"><label>Nama pemilik / pengemudi (bila diketahui)</label><input class="inp" id="np" maxlength="120" value="' + esc(D.namaPemilik) + '"></div>' +
        '<div class="field"><label>Wilayah (kecamatan)</label><select class="sel" id="wil">' + UI.Form.opsi(B.kecamatan, D.wilayah, 'Pilih kecamatan…') + '</select></div></div>';
      var inp = $('#nopol');
      var riwayat = App.debounce(function () {
        var n = nn(inp.value); if (n.length < 4) { $('#riw').innerHTML = ''; return; }
        App.swr('etle.riwayatNopol', { nopol: n }, { maxAge: 60000 }).then(function (r) {
          if (nn(inp.value) !== n || !$('#riw')) return;
          $('#riw').innerHTML = r.hitung.total ? '<span style="color:var(--warn-tx,#B45309)">' + ikon('history') + ' Pernah tercatat ' + r.hitung.total + '× di ETLE (' + ['Terbit', 'Tindak Lanjut', 'Selesai'].filter(function (s) { return r.hitung[s]; }).map(function (s) { return s + ' ' + r.hitung[s]; }).join(', ') + '). Bukan status hukum kendaraan.</span>' : ikon('check') + ' Belum ada catatan ETLE untuk nopol ini.';
        }, function () {});
      }, 500);
      inp.oninput = function () { ubah('nopol', inp.value.toUpperCase()); riwayat(); };
      $$('input[name=jk]').forEach(function (r) { r.onchange = function () { ubah('jenisKendaraan', r.value); }; });
      $('#mw').oninput = function () { ubah('merekWarna', this.value); }; $('#np').oninput = function () { ubah('namaPemilik', this.value); }; $('#wil').onchange = function () { ubah('wilayah', this.value); };
      if (D.nopol) riwayat();
      bar('<a class="btn btn-outline" href="#/beranda" style="flex:none;width:52px" aria-label="Kembali">' + ikon('close') + '</a><button class="btn btn-amber grow" id="lanjut">Lanjut: Pelanggaran' + ikon('arrow_forward') + '</button>');
      $('#lanjut').onclick = function () {
        if (nn(D.nopol).length < 3) { App.toast('Isi nomor polisi.', 'warn'); inp.focus(); return; }
        if (!D.jenisKendaraan) { App.toast('Pilih jenis kendaraan.', 'warn'); return; }
        langkah(2); if (D.id) sinkron().catch(function () {});
      };
      if (!D.nopol) setTimeout(function () { inp.focus(); }, 50);
    }

    function l2() {
      var j = jenisById(D.idJenis);
      MB.innerHTML = steps(2) + '<div class="card card-b stack"><h3>' + ikon('gavel') + ' Jenis pelanggaran</h3><div class="inp-ico">' + ikon('search') + '<input class="inp" id="qj" type="search" placeholder="Cari pasal atau uraian…"></div><div class="opsi-list" id="lj"></div></div>' +
        '<div id="detJ"></div>';
      function daftar() {
        var q = $('#qj').value.toLowerCase();
        var l = B.jenis.filter(function (x) { return !q || (x.pasal + ' ' + x.uraian + ' ' + x.singkat + ' ' + x.kategori).toLowerCase().indexOf(q) > -1; });
        $('#lj').innerHTML = l.length ? l.map(function (x) { return '<label><input type="radio" name="jp" value="' + esc(x.id) + '"' + (D.idJenis === x.id ? ' checked' : '') + '><div><b class="small">' + esc(x.singkat) + '</b><div class="tiny muted">' + esc(x.pasal) + (x.kategori ? ' · ' + esc(x.kategori) : '') + '</div></div></label>'; }).join('')
          : '<div class="kosong small">' + (B.jenis.length ? 'Tidak ada yang cocok.' : 'Master jenis pelanggaran masih kosong. Hubungi Admin ETLE.') + '</div>';
        $$('#lj input').forEach(function (r) { r.onchange = function () { if (D.idJenis !== r.value) { ubah('idJenis', r.value); D.sanksi = []; simpanD(); } detail(); }; });
      }
      function detail() {
        j = jenisById(D.idJenis);
        if (!j) { $('#detJ').innerHTML = ''; return; }
        if (!D.sanksi.length && j.opsi.length === 1) { D.sanksi = [j.opsi[0]]; D.kotor = true; simpanD(); }
        $('#detJ').innerHTML = '<div class="info-hukum"><b>' + esc(j.pasal) + ' — Perda Kota Balikpapan No. 7 Tahun 2022</b><div style="margin-top:6px;white-space:pre-line">' + esc(j.uraian) + '</div>' + (j.sanksi ? '<div style="margin-top:6px;opacity:.85">Sanksi: ' + esc(j.sanksi) + '</div>' : '') + '</div>' +
          '<div class="card card-b stack"><h3>Sanksi dikenakan <span class="req">*</span></h3><div class="stack" style="gap:8px">' + j.opsi.map(function (o) { return '<label class="chk"><input type="checkbox" name="sk" value="' + esc(o) + '"' + (D.sanksi.indexOf(o) > -1 ? ' checked' : '') + '><span>' + esc(o) + '</span></label>'; }).join('') + '</div>' +
          (j.perluUji ? '<div class="form-grid"><div class="field"><label>Nomor bukti uji <span class="req">*</span></label><input class="inp mono" id="nbu" maxlength="60" value="' + esc(D.noBuktiUji) + '"></div><div class="field"><label>Masa berlaku uji <span class="req">*</span></label><input class="inp" type="date" id="mbu" value="' + esc(D.masaBerlakuUji) + '"></div></div>' : '') +
          '<div class="field"><label>Keterangan petugas</label><textarea class="ta" id="ket" rows="3" maxlength="600">' + esc(D.keterangan) + '</textarea><div class="hint"><span id="nk">' + D.keterangan.length + '</span>/600</div></div></div>';
        $$('input[name=sk]').forEach(function (c) { c.onchange = function () { D.sanksi = $$('input[name=sk]:checked').map(function (x) { return x.value; }); D.kotor = true; simpanD(); }; });
        $('#ket').oninput = function () { ubah('keterangan', this.value); $('#nk').textContent = this.value.length; };
        if ($('#nbu')) { $('#nbu').oninput = function () { ubah('noBuktiUji', this.value); }; $('#mbu').onchange = function () { ubah('masaBerlakuUji', this.value); }; }
      }
      $('#qj').oninput = App.debounce(daftar, 120); daftar(); detail();
      bar('<button class="btn btn-outline" id="kembali" style="flex:none;width:52px" aria-label="Kembali">' + ikon('arrow_back') + '</button><button class="btn btn-amber grow" id="lanjut">Lanjut: Bukti & lokasi' + ikon('arrow_forward') + '</button>');
      $('#kembali').onclick = function () { langkah(1); };
      $('#lanjut').onclick = function () {
        var jj = jenisById(D.idJenis);
        if (!jj) { App.toast('Pilih jenis pelanggaran.', 'warn'); return; }
        if (!D.sanksi.length) { App.toast('Pilih minimal satu sanksi.', 'warn'); return; }
        if (jj.perluUji && (!D.noBuktiUji || !D.masaBerlakuUji)) { App.toast('Isi nomor dan masa berlaku bukti uji.', 'warn'); return; }
        langkah(3); sinkron().catch(function (e) { App.toast('Draf belum tersimpan ke server: ' + e.message, 'warn'); });
      };
    }

    function l3() {
      var j = jenisById(D.idJenis), slots = ['depan', 'belakang'].concat(j && j.perluUji ? ['uji'] : []).concat(['tambahan']);
      MB.innerHTML = steps(3) + '<div id="dup"></div><div class="card card-b stack"><h3>' + ikon('photo_camera') + ' Foto bukti</h3><div class="small muted">Plat depan dan belakang wajib' + (j && j.perluUji ? ', bukti uji wajib' : '') + '. Foto dikompres di HP lalu diunggah di latar.</div><div class="foto-grid" id="fg"></div></div>' +
        '<div class="card card-b stack"><h3>' + ikon('location_on') + ' Lokasi</h3><div class="field"><label>Nama jalan / patokan <span class="req">*</span></label><input class="inp" id="lok" maxlength="200" value="' + esc(D.lokasi) + '" placeholder="Jl. Jend. Sudirman, depan …"></div>' +
        '<div class="row wrap-row"><button class="btn btn-outline" id="gps">' + ikon('my_location') + 'Ambil titik GPS</button><span class="small mono muted" id="kor">' + (D.lat ? esc(D.lat + ', ' + D.lng) : 'belum ada titik') + '</span></div></div>';
      function dup() { $('#dup').innerHTML = D.duplikat && D.duplikat.length ? '<div class="note warn">' + ikon('warning') + '<div><b>Peringatan pelanggaran berulang.</b> Nopol ' + esc(D.nopol) + ' sudah tercatat dengan jenis yang sama dalam 24 jam: ' + D.duplikat.map(function (x) { return esc(x.nomor || x.id) + ' (' + esc(x.lokasi || '-') + ')'; }).join(', ') + '. Pastikan bukan catatan ganda.</div></div>' : ''; }
      function gambarFoto() {
        if (!$('#fg')) return;
        $('#fg').innerHTML = slots.map(function (s) {
          var ada = FOTO[s] || (D.foto[s] && D.foto[s].ok), st = ST[s];
          return '<label class="foto-slot' + (ada ? ' isi' : '') + '" data-slot="' + s + '">' + (FOTO[s] ? '<img src="' + FOTO[s] + '" alt="">' : '') +
            (ada ? '' : ikon('add_a_photo') + '<b class="small">' + SLOT[s] + (s === 'tambahan' ? '' : ' *') + '</b>') +
            '<span class="st">' + (st === 'naik' ? '<span class="badge b-info">Mengunggah…</span>' : st === 'gagal' ? '<span class="badge b-bad">Gagal — ketuk ulang</span>' : (D.foto[s] && D.foto[s].ok) ? '<span class="badge b-ok">' + ikon('check') + SLOT[s] + '</span>' : '') + '</span>' +
            (ada && st !== 'naik' ? '<button type="button" class="x" data-hapus="' + s + '" aria-label="Hapus foto">' + ikon('close') + '</button>' : '') +
            '<input type="file" accept="image/*" capture="environment"></label>';
        }).join('');
        $$('#fg .foto-slot').forEach(function (el) {
          var s = el.dataset.slot;
          $('input', el).onchange = function () { var f = this.files[0]; if (f) unggah(s, f); this.value = ''; };
          if (ST[s] === 'gagal' && FOTO[s]) el.onclick = function (e) { e.preventDefault(); kirim(s); };
        });
        $$('#fg [data-hapus]').forEach(function (b) { b.onclick = function (e) {
          e.preventDefault(); e.stopPropagation(); var s = b.dataset.hapus;
          delete FOTO[s]; var adaServer = D.foto[s] && D.foto[s].ok; delete D.foto[s]; delete ST[s]; simpanD(); gambarFoto();
          if (adaServer && D.id) App.api('etle.fotoHapus', { id: D.id, slot: s }).catch(function (er) { App.toast(er.message, 'bad'); });
        }; });
      }
      function unggah(s, file) {
        App.kompres(file, 1600, 350).then(function (u) { FOTO[s] = u; kirim(s); }, function (e) { App.toast(e.message, 'bad'); });
      }
      function kirim(s) {
        ST[s] = 'naik'; gambarFoto();
        sinkron().then(function (id) { return App.api('etle.foto', { id: id, slot: s, dataUrl: FOTO[s] }); })
          .then(function (r) { ST[s] = 'ok'; if (D) { D.foto[s] = { ok: 1, hash: r.hash }; simpanD(); } gambarFoto(); dup(); }, function (e) { ST[s] = 'gagal'; gambarFoto(); App.toast('Foto ' + SLOT[s] + ': ' + e.message, 'bad'); });
      }
      gambarFoto(); dup();
      $('#lok').oninput = function () { ubah('lokasi', this.value); };
      $('#gps').onclick = function () {
        if (!navigator.geolocation) return App.toast('Perangkat tidak mendukung GPS.', 'warn');
        var b = this; b.classList.add('loading');
        navigator.geolocation.getCurrentPosition(function (p) { b.classList.remove('loading'); ubah('lat', p.coords.latitude.toFixed(6)); ubah('lng', p.coords.longitude.toFixed(6)); $('#kor').textContent = D.lat + ', ' + D.lng + ' (± ' + Math.round(p.coords.accuracy) + ' m)'; },
          function (e) { b.classList.remove('loading'); App.toast('GPS tidak didapat: ' + e.message, 'bad'); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
      };
      if (!D.lat && navigator.geolocation && navigator.permissions) navigator.permissions.query({ name: 'geolocation' }).then(function (p) { if (p.state === 'granted') $('#gps').click(); }).catch(function () {});
      bar('<button class="btn btn-outline" id="kembali" style="flex:none;width:52px" aria-label="Kembali">' + ikon('arrow_back') + '</button><button class="btn btn-amber grow" id="lanjut">Pratinjau' + ikon('visibility') + '</button>');
      $('#kembali').onclick = function () { langkah(2); };
      $('#lanjut').onclick = function () {
        var kurang = slots.filter(function (s) { return s !== 'tambahan' && !(D.foto[s] && D.foto[s].ok); });
        if (kurang.length) { App.toast('Foto belum lengkap/terunggah: ' + kurang.map(function (s) { return SLOT[s]; }).join(', ') + '.', 'warn'); return; }
        if (!D.lokasi.trim()) { App.toast('Isi nama jalan/patokan.', 'warn'); $('#lok').focus(); return; }
        langkah(4);
      };
    }

    function pratinjau() {
      var j = jenisById(D.idJenis) || {};
      judul('Pratinjau');
      MB.innerHTML = '<div class="card card-b"><div class="row between"><h3>Periksa sebelum terbit</h3><span class="badge b-slate">Draf</span></div><p class="small muted" style="margin:6px 0 0">Setelah terbit, data tidak dapat diubah petugas. Koreksi hanya oleh Admin ETLE dengan alasan.</p></div><div id="dup"></div>' +
        '<div class="card card-b"><dl class="dl"><div><dt>Nomor polisi</dt><dd><span class="plate">' + esc(D.nopol) + '</span></dd></div><div><dt>Jenis kendaraan</dt><dd>' + esc(D.jenisKendaraan) + '</dd></div>' +
        '<div><dt>Merek / warna</dt><dd>' + esc(D.merekWarna || '-') + '</dd></div><div><dt>Wilayah</dt><dd>' + esc(D.wilayah || '-') + '</dd></div><div><dt>Pelanggaran</dt><dd><b>' + esc(j.pasal || '') + '</b> ' + esc(j.singkat || '') + '</dd></div>' +
        '<div><dt>Sanksi</dt><dd>' + D.sanksi.map(function (s) { return '<span class="badge b-warn" style="margin:2px">' + esc(s) + '</span>'; }).join('') + '</dd></div><div><dt>Lokasi</dt><dd>' + esc(D.lokasi) + (D.lat ? '<div class="tiny mono muted">' + esc(D.lat + ', ' + D.lng) + '</div>' : '') + '</dd></div>' +
        '<div><dt>Foto</dt><dd>' + Object.keys(D.foto).filter(function (s) { return D.foto[s].ok; }).map(function (s) { return '<span class="badge b-ok" style="margin:2px">' + ikon('check') + esc(SLOT[s]) + '</span>'; }).join('') + '</dd></div></dl></div>' +
        (D.keterangan ? '<div class="card card-b small"><b>Keterangan:</b> ' + esc(D.keterangan) + '</div>' : '');
      $('#dup').innerHTML = D.duplikat && D.duplikat.length ? '<div class="note warn">' + ikon('warning') + '<div><b>Pelanggaran berulang dalam 24 jam</b> (' + D.duplikat.length + ' catatan). Pastikan bukan catatan ganda.</div></div>' : '';
      bar('<button class="btn btn-outline" id="kembali" style="flex:none;width:52px" aria-label="Kembali">' + ikon('arrow_back') + '</button><button class="btn btn-primary grow" id="terbit">' + ikon('verified') + 'Terbitkan Surat</button>');
      $('#kembali').onclick = function () { langkah(3); };
      $('#terbit').onclick = function () {
        var b = this;
        UI.Form.muat(b, sinkron(true).then(function (id) { return App.api('etle.terbitkan', { id: id }); })).then(function (r) {
          var id = D.id; hapusD(); App.toast('Surat terbit: ' + r.nomor, 'ok');
          App.swr('etle.ringkas', {}, { fresh: true }).catch(function () {}); App.swr('etle.list', {}, { fresh: true }).catch(function () {});
          location.hash = '#/surat/' + encodeURIComponent(id);
        }, function (e) { App.toast(e.message, 'bad'); });
      };
    }

    // ---------------------------------------------------------------- surat, kasus, akun
    function surat(args) {
      judul('Surat Penindakan'); bar('');
      MB.innerHTML = '<div id="sp"></div>';
      suratPanel($('#sp'), args[0], {
        atas: function (s) { return '<div class="card card-b center stack"><div style="font-size:44px;color:var(--ok)">' + ikon('verified', 'fill') + '</div><h3>Surat penindakan ' + (s.kasus.status === 'Terbit' ? 'berhasil diterbitkan' : esc(s.kasus.status)) + '</h3>' +
          '<div class="mono" style="font-size:18px;font-weight:700">' + esc(s.kasus.nomor) + '</div><div class="row" style="justify-content:center"><button class="btn btn-outline btn-sm" id="salin">' + ikon('content_copy') + 'Salin nomor</button>' + (navigator.share ? '<button class="btn btn-outline btn-sm" id="bagi">' + ikon('share') + 'Bagikan</button>' : '') + '</div></div>'; },
        tombol: '<a class="btn btn-amber" href="#/catat?baru=1">' + ikon('add') + 'Tindak baru</a>',
        selesai: function (s) {
          $('#salin').onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(s.kasus.nomor) : Promise.reject()).then(function () { App.toast('Nomor disalin.', 'ok'); }, function () { App.toast(s.kasus.nomor); }); };
          if ($('#bagi')) $('#bagi').onclick = function () { navigator.share({ title: 'Surat penindakan ' + s.kasus.nomor, text: 'Cek status surat ' + s.kasus.nomor, url: s.qr || App.ROOT }).catch(function () {}); };
        }
      });
    }
    function kasus(args) {
      if (args[0]) return kasusDetail(args[0]);
      judul('Kasus Saya'); bar('');
      var filt = '';
      MB.innerHTML = '<div class="inp-ico">' + ikon('search') + '<input class="inp" id="qk" type="search" placeholder="Cari nopol atau nomor surat…"></div><div class="seg" id="fs" style="width:100%;overflow-x:auto;flex-wrap:nowrap">' + ['', 'Draft', 'Terbit', 'Tindak Lanjut', 'Selesai', 'Dibatalkan'].map(function (s) { return '<button type="button" data-s="' + s + '" class="' + (s ? '' : 'on') + '">' + (s || 'Semua') + '</button>'; }).join('') + '</div><div id="lk">' + UI.sk.baris(6) + '</div>';
      var semua = [];
      function tampil() {
        var q = nn($('#qk').value), l = semua.filter(function (k) { return (!filt || k.status === filt) && (!q || nn(k.nopol + k.nomor).indexOf(q) > -1); });
        $('#lk').innerHTML = l.length ? l.slice(0, 100).map(itemKasus).join('') + (l.length > 100 ? '<p class="small muted center">Menampilkan 100 dari ' + l.length + '. Persempit pencarian.</p>' : '') : '<div class="kosong card">' + ikon('search_off') + '<h4>Tidak ada kasus</h4></div>';
      }
      $('#qk').oninput = App.debounce(tampil, 150);
      $$('#fs button').forEach(function (b) { b.onclick = function () { filt = b.dataset.s; $$('#fs button').forEach(function (x) { x.classList.toggle('on', x === b); }); tampil(); }; });
      App.swr('etle.list', {}, { maxAge: 20000, onData: function (d) { semua = d; if ($('#lk')) tampil(); } }).catch(function (e) { if ($('#lk')) $('#lk').innerHTML = galat(e); });
    }
    function kasusDetail(id) {
      judul('Detail Kasus'); bar('');
      MB.innerHTML = UI.sk.baris(10);
      App.swr('etle.detail', { id: id }, { maxAge: 30000, onData: function (x) {
        if (location.hash.indexOf('#/kasus/') !== 0) return;
        MB.innerHTML = '<a href="#/kasus" class="small">' + ikon('arrow_back') + ' Kasus saya</a><div class="card card-b stack"><div class="row between">' + App.badge(x.status) + '<span class="small muted">' + fmt.tglJam(x.terbit || x.waktu) + '</span></div><div class="row"><span class="plate">' + esc(x.nopol) + '</span><b>' + esc(x.jenisKendaraan || '') + '</b></div>' +
          (x.nomor ? '<div class="mono">' + esc(x.nomor) + '</div>' : '') + '<dl class="dl"><div><dt>Pelanggaran</dt><dd><b>' + esc(x.pasal || '-') + '</b> ' + esc(x.jenis || '') + '</dd></div><div><dt>Lokasi</dt><dd>' + esc(x.lokasi || '-') + '</dd></div><div><dt>Sanksi</dt><dd>' + esc(x.sanksi.join(', ') || '-') + '</dd></div>' + (x.alasanBatal ? '<div><dt>Alasan batal</dt><dd>' + esc(x.alasanBatal) + '</dd></div>' : '') + '</dl></div>' +
          (x.tindak.length ? '<div class="card card-b"><h3>Tindak lanjut</h3><div class="tl" style="margin-top:10px">' + x.tindak.map(function (t) { return '<div class="tl-i on"><span class="dot">' + ikon('check') + '</span><b>' + esc(t.jenis) + '</b> <span class="small muted">' + fmt.tgl(t.tanggal) + '</span><div class="small">' + esc(t.catatan || '') + '</div></div>'; }).join('') + '</div></div>' : '') +
          '<div class="row wrap-row">' + (x.status === 'Draft' ? '<button class="btn btn-amber grow" id="lanjutDraf">' + ikon('edit') + 'Lanjutkan draf</button><button class="btn btn-outline" id="hapusDraf" style="color:var(--bad)">' + ikon('delete') + 'Hapus draf</button>' : '<a class="btn btn-primary grow" href="#/surat/' + encodeURIComponent(x.id) + '">' + ikon('description') + 'Lihat / cetak surat</a>') + '</div>';
        if (x.status === 'Draft') {
          $('#lanjutDraf').onclick = function () {
            D = { id: x.id, langkah: 1, nopol: x.nopol, jenisKendaraan: x.jenisKendaraan || '', merekWarna: x.merekWarna || '', namaPemilik: x.namaPemilik || '', wilayah: x.wilayah || '', idJenis: x.idJenis || '', sanksi: x.sanksi, keterangan: x.keterangan || '',
              noBuktiUji: x.noBuktiUji || '', masaBerlakuUji: x.masaBerlakuUji || '', lokasi: x.lokasi || '', lat: x.lat || '', lng: x.lng || '', foto: {}, duplikat: [], kotor: false };
            x.foto.forEach(function (f) { D.foto[f.slot] = { ok: 1, hash: f.hash }; }); FOTO = {}; ST = {}; simpanD(); location.hash = '#/catat';
          };
          $('#hapusDraf').onclick = function () { UI.Modal.konfirm('Hapus draf ' + esc(x.nopol) + ' beserta fotonya?', { ok: 'Hapus', bahaya: true }).then(function (ok) { if (ok) App.api('etle.hapusDraft', { id: x.id }).then(function () { var d = bacaD(); if (d && d.id === x.id) hapusD(); App.toast('Draf dihapus.', 'ok'); App.swr('etle.list', {}, { fresh: true }).catch(function () {}); location.hash = '#/kasus'; }, function (e) { App.toast(e.message, 'bad'); }); }); };
        }
      } }).catch(function (e) { MB.innerHTML = galat(e); });
    }
    function akun() {
      judul('Akun'); bar('');
      MB.innerHTML = '<div class="card card-b row"><span class="avatar" style="width:52px;height:52px;font-size:20px">' + (me.foto ? '<img src="' + esc(me.foto) + '" alt="" referrerpolicy="no-referrer">' : esc((me.nama || me.email || '?').charAt(0).toUpperCase())) + '</span><div><b>' + esc(me.nama || me.email) + '</b><div class="small muted">' + esc(me.email) + '</div><span class="badge b-navy">' + esc(me.role) + '</span></div></div>' +
        '<div class="card"><a class="row" href="#" id="aVersi" style="padding:14px 16px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none">' + ikon('info') + '<span class="grow">Versi aplikasi</span><span class="mono small">v' + esc(App.VERSI) + '</span></a>' +
        (App.Pasang.evt ? '<a class="row" href="#" id="aPasang" style="padding:14px 16px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none">' + ikon('install_mobile') + '<span class="grow">Pasang di layar utama</span></a>' : '') +
        (ADM.indexOf(me.role) > -1 ? '<a class="row" href="./" style="padding:14px 16px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none">' + ikon('desktop_windows') + '<span class="grow">Buka panel admin</span></a>' : '') +
        '<a class="row" href="#" id="aKeluar" style="padding:14px 16px;color:var(--bad);text-decoration:none">' + ikon('logout') + '<span class="grow">Keluar</span></a></div>' +
        '<p class="small muted center">Sesi berakhir ' + fmt.tglJam(new Date(sesi.exp).toISOString()) + '. Draf yang belum terbit tetap tersimpan di perangkat ini.</p>';
      $('#aVersi').onclick = function (e) { e.preventDefault(); Shell.riwayatVersi(); };
      if ($('#aPasang')) $('#aPasang').onclick = function (e) { e.preventDefault(); App.Pasang.tampilkan(); };
      $('#aKeluar').onclick = function (e) { e.preventDefault(); UI.Modal.konfirm('Keluar dari ETLE Dishub?', { ok: 'Keluar' }).then(function (ok) { if (ok) Shell.keluar(); }); };
    }

    var R = { beranda: beranda, catat: catat, kasus: kasus, surat: surat, akun: akun };
    function jalan() {
      var h = (location.hash || '').replace(/^#\/?/, ''), p = h.split('?'), seg = p[0].split('/').filter(String), nama = R[seg[0]] ? seg[0] : 'beranda';
      UI.tutupSemua();
      $$('.m-nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.n === nama || (nama === 'surat' && a.dataset.n === 'kasus')); });
      R[nama](seg.slice(1).map(decodeURIComponent), new URLSearchParams(p[1] || ''));
    }
    window.addEventListener('hashchange', jalan);
    document.addEventListener('versi-beda', function (e) { $('#banner').innerHTML = '<div class="m-body" style="padding-bottom:0"><div class="note warn">' + ikon('warning') + '<div class="small">Versi aplikasi v' + esc(e.detail.app) + ' ≠ server v' + esc(e.detail.server) + '. Muat ulang aplikasi.</div></div></div>'; });
    App.Sesi.pantau(); App.warmUp('admin');
    boot().catch(function () {});
    jalan();
    setTimeout(function () { App.swr('etle.list', {}, { maxAge: 20000 }).catch(function () {}); }, 1500);
  }

  // ======================================================================================================
  // PANEL DESKTOP — ADMIN ETLE / SUPERADMIN
  // ======================================================================================================
  function dashboard(el) {
    var hidup = Shell.hidup();
    el.innerHTML = Shell.judul(el, { eyebrow: 'Ringkasan', h: 'Dashboard Penindakan', p: 'Kasus berstatus Terbit atau Tindak Lanjut menahan penerbitan Kartu Pengawasan SIMAU untuk nopol yang sama.', aksi: '<a class="btn btn-amber" href="./?m=1#/catat?baru=1">' + ikon('add_a_photo') + 'Catat (tampilan lapangan)</a>' }) +
      '<div class="grid g4" id="kpi">' + UI.sk.kartu(4) + '</div><div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>Surat terbit per bulan</h3></div><div class="card-b" id="c1"></div></div><div class="card"><div class="card-h"><h3>Pasal terbanyak</h3></div><div class="card-b" id="c2"></div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h3>' + ikon('pending_actions') + 'Perlu tindak lanjut</h3><a class="btn btn-ghost btn-sm" href="#/kasus?status=Terbit">Semua' + ikon('arrow_forward') + '</a></div><div id="perlu">' + UI.sk.baris(5) + '</div></div>';
    App.swr('etle.dashboard', {}, { maxAge: 30000, onData: function (d) {
      if (!hidup()) return;
      var k = d.kpi, st = function (l, v, i, w, ft) { return '<div class="card stat" style="border-left:4px solid ' + w + '"><div class="lbl">' + l + '<span class="ico">' + ikon(i) + '</span></div><div class="val">' + fmt.angka(v) + '</div>' + (ft ? '<div class="ft">' + ft + '</div>' : '') + '</div>'; };
      $('#kpi').innerHTML = st('Terbit bulan ini', k.bulanIni, 'assignment', 'var(--navy)') + st('Dalam proses', k.proses, 'hourglass_top', 'var(--bad)', 'menahan kartu SIMAU') + st('Selesai', k.selesai, 'task_alt', 'var(--ok)') + st('Draf', k.draft, 'edit_note', 'var(--muted)', k.dibatalkan + ' dibatalkan');
      UI.Chart.batang($('#c1'), { label: d.bulan.map(fmt.bulan), seri: [{ nama: 'Surat', data: d.bulan.map(function (b) { return d.perBulan[b] || 0; }) }] });
      UI.Chart.batangH($('#c2'), { item: d.topJenis.map(function (x) { return { l: x.jenis, n: x.n }; }) });
      $('#perlu').innerHTML = d.perluTindak.length ? '<table class="tbl"><thead><tr><th>Nomor</th><th>Nopol</th><th>Pelanggaran</th><th>Lokasi</th><th class="right">Umur</th></tr></thead><tbody>' + d.perluTindak.map(function (x) {
        return '<tr style="cursor:pointer" onclick="location.hash=\'#/kasus?id=' + encodeURIComponent(x.id) + '\'"><td class="mono small">' + esc(x.nomor) + '</td><td>' + App.plat(x.nopol) + '</td><td class="small">' + esc(x.jenis) + '</td><td class="small">' + esc(x.lokasi || '') + '</td><td class="right"><b style="color:' + (x.hari > 14 ? 'var(--bad-tx)' : 'inherit') + '">' + x.hari + ' hari</b></td></tr>';
      }).join('') + '</tbody></table>' : '<div class="kosong">' + ikon('task_alt') + '<h4>Semua surat sudah ditindaklanjuti</h4></div>';
    } }).catch(function (e) { if (hidup()) $('#kpi').innerHTML = '<div style="grid-column:1/-1">' + galat(e) + '</div>'; });
  }

  function semuaKasus(el, args, q) {
    if (q.get('id')) return detailKasus(el, q.get('id'));
    var hidup = Shell.hidup(), tbl = null;
    el.innerHTML = Shell.judul(el, { eyebrow: 'Penindakan', h: 'Semua Kasus', p: 'Klik baris untuk detail, tindak lanjut, koreksi, atau pembatalan.', aksi: '<button class="btn btn-outline" id="xl">' + ikon('download') + 'Ekspor Excel</button>' }) + '<div class="card" id="t">' + UI.sk.baris(10) + '</div>';
    App.swr('etle.list', {}, { maxAge: 20000, onData: function (d) {
      if (!hidup()) return;
      if (!tbl) {
        tbl = UI.Tabel($('#t'), {
          cari: 'Cari nopol, nomor surat, lokasi, petugas…', perHal: 20, data: d,
          saringHtml: '<select class="sel" data-saring="status" style="width:160px;height:38px"><option value="">Semua status</option>' + ['Draft', 'Terbit', 'Tindak Lanjut', 'Selesai', 'Dibatalkan'].map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select>' +
            '<select class="sel" data-saring="wilayah" style="width:180px;height:38px"><option value="">Semua kecamatan</option>' + (B ? B.kecamatan : []).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select>',
          saring: function (r, k, v) { return r[k] === v; },
          kolom: [{ k: 'waktu', l: 'Waktu', f: function (r) { return fmt.tglJam(r.terbit || r.waktu); }, nilaiUrut: function (r) { return r.terbit || r.waktu; } }, { k: 'nomor', l: 'Nomor surat', cls: 'mono small' },
            { k: 'nopol', l: 'Nopol', f: function (r) { return App.plat(r.nopol); }, cariNilai: function (r) { return r.nopol + ' ' + nn(r.nopol); } }, { k: 'jenis', l: 'Pelanggaran', f: function (r) { return '<b class="small">' + esc(r.pasal || '') + '</b><div class="tiny muted">' + esc(r.jenis || '') + '</div>'; } },
            { k: 'lokasi', l: 'Lokasi', f: function (r) { return '<span class="small">' + esc(r.lokasi || '') + '</span><div class="tiny muted">' + esc(r.wilayah || '') + '</div>'; } }, { k: 'petugas', l: 'Petugas', cls: 'small' }, { k: 'status', l: 'Status', f: function (r) { return App.badge(r.status); } }],
          onRow: function (r) { location.hash = '#/kasus?id=' + encodeURIComponent(r.id); }, kosong: { ikon: 'assignment', judul: 'Belum ada kasus' }
        });
        var s = $('[data-saring="status"]', $('#t')); if (s && q.get('status')) { s.value = q.get('status'); s.dispatchEvent(new Event('change')); }
      } else tbl.setData(d);
    } }).catch(function (e) { if (hidup()) $('#t').innerHTML = galat(e); });
    $('#xl').onclick = function () {
      App.Xlsx.unduh('Kasus-ETLE-' + fmt.hariIni(), [{ nama: 'Kasus', kolom: ['ID', 'Nomor Surat', 'Status', 'Waktu', 'Terbit', 'Nopol', 'Jenis Kendaraan', 'Pasal', 'Pelanggaran', 'Sanksi', 'Kecamatan', 'Lokasi', 'Petugas', 'Jumlah Foto'],
        baris: (tbl ? tbl.tersaring() : []).map(function (r) { return [r.id, r.nomor, r.status, r.waktu, r.terbit, r.nopol, r.jenisKendaraan, r.pasal, r.jenis, r.sanksi.join('; '), r.wilayah, r.lokasi, r.petugas, r.jumlahFoto]; }) }]);
    };
  }

  function detailKasus(el, id) {
    var hidup = Shell.hidup();
    el.innerHTML = '<a href="#/kasus" class="btn btn-ghost btn-sm">' + ikon('arrow_back') + 'Semua kasus</a><div id="dk" style="margin-top:12px">' + UI.sk.baris(10) + '</div>';
    function muat(fresh) {
      return App.swr('etle.detail', { id: id }, { maxAge: 20000, fresh: fresh, onData: function (x) {
        if (!hidup()) return;
        var terbuka = x.status === 'Terbit' || x.status === 'Tindak Lanjut', bisaKoreksi = x.status !== 'Draft' && x.status !== 'Dibatalkan';
        $('#dk').innerHTML = '<div class="ph"><div><div class="eyebrow">Kasus ' + esc(x.id) + '</div><h1 class="mono">' + esc(x.nomor || '(draf)') + '</h1><p>' + App.badge(x.status) + ' ' + App.plat(x.nopol) + ' · ' + esc(x.pasal || '') + ' ' + esc(x.jenis || '') + '</p></div><div class="aksi">' +
          (bisaKoreksi ? '<button class="btn btn-outline" id="koreksi">' + ikon('edit') + 'Koreksi</button><button class="btn btn-danger" id="batal">' + ikon('block') + 'Batalkan</button>' : '') + (x.status !== 'Draft' ? '<button class="btn btn-primary" id="surat">' + ikon('print') + 'Surat</button>' : '') + '</div></div>' +
          (terbuka ? '<div class="note crit" style="margin-bottom:16px">' + ikon('lock') + '<div>Kasus ini <b>menahan penerbitan Kartu Pengawasan SIMAU</b> untuk nopol ' + esc(x.nopol) + (x.kendaraanSimau ? ' (terdaftar di SIMAU)' : ' (tidak terdaftar di SIMAU)') + ' sampai berstatus Selesai atau Dibatalkan.</div></div>' : '') +
          '<div class="grid g2" style="align-items:start"><div class="stack"><div class="card"><div class="card-h"><h3>Data kasus</h3></div><div class="card-b"><dl class="dl">' +
          [['Waktu catat', fmt.tglJam(x.waktu)], ['Terbit', x.terbit ? fmt.tglJam(x.terbit) : '—'], ['Jenis kendaraan', esc(x.jenisKendaraan || '-')], ['Merek / warna', esc(x.merekWarna || '-')], ['Pemilik / pengemudi', esc(x.namaPemilik || '-')],
            ['Kecamatan', esc(x.wilayah || '-')], ['Lokasi', esc(x.lokasi || '-') + (x.lat ? '<div class="tiny mono muted">' + esc(x.lat + ', ' + x.lng) + '</div>' : '')], ['Sanksi', esc(x.sanksi.join(', ') || '-')], ['Keterangan', esc(x.keterangan || '-')],
            ['Bukti uji', x.noBuktiUji ? esc(x.noBuktiUji) + ' · s.d. ' + fmt.tglP(x.masaBerlakuUji) : '—'], ['Petugas', esc(x.petugas)], ['Diubah', x.diubahOleh ? esc(x.diubahOleh) + ' · ' + fmt.tglJam(x.diubahPada) : '—']].map(function (b) { return '<div><dt>' + b[0] + '</dt><dd>' + b[1] + '</dd></div>'; }).join('') +
          (x.alasanBatal ? '<div><dt>Alasan batal</dt><dd>' + esc(x.alasanBatal) + '</dd></div>' : '') + '</dl></div></div>' +
          '<div class="card"><div class="card-h"><h3>Foto bukti (' + x.foto.length + ')</h3>' + (x.foto.length ? '<button class="btn btn-ghost btn-sm" id="muatFoto">' + ikon('image') + 'Tampilkan</button>' : '') + '</div><div class="card-b"><div class="foto-grid" id="fotoK">' + x.foto.map(function (f) { return '<div class="foto-slot isi" data-s="' + f.slot + '"><span class="st"><span class="badge b-navy">' + esc(SLOT[f.slot] || f.slot) + '</span></span><span class="tiny muted mono">' + esc(String(f.hash || '').slice(0, 12)) + '</span></div>'; }).join('') + '</div></div></div></div>' +
          '<div class="stack"><div class="card"><div class="card-h"><h3>Tindak lanjut</h3></div><div class="card-b">' + (x.tindak.length ? '<div class="tl">' + x.tindak.map(function (t) { return '<div class="tl-i on"><span class="dot">' + ikon(t.jenis === 'Selesai' ? 'task_alt' : 'arrow_forward') + '</span><div class="row between"><b>' + esc(t.jenis) + '</b><span class="small muted">' + fmt.tglP(t.tanggal) + '</span></div><div class="small">' + esc(t.catatan || '') + '</div><div class="tiny muted">' + esc(t.oleh) + '</div></div>'; }).join('') + '</div>' : '<div class="small muted">Belum ada tindak lanjut.</div>') +
          (terbuka ? '<form id="fT" class="stack" style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px">' + UI.Form.bangun([{ k: 'jenis', l: 'Jenis tindak lanjut', t: 'select', opsi: B.jenisTindak, wajib: true }, { k: 'tanggal', l: 'Tanggal', t: 'date', awal: fmt.hariIni() }, { k: 'catatan', l: 'Catatan', t: 'textarea', rows: 2, maks: 1000 }], {}) +
            '<div class="hint">Memilih <b>Selesai</b> menutup kasus dan membuka blokir kartu SIMAU.</div><button class="btn btn-primary">' + ikon('add') + 'Catat tindak lanjut</button></form>' : '') + '</div></div>' +
          (x.perubahan && x.perubahan.length ? '<div class="card"><div class="card-h"><h3>Jejak perubahan</h3></div><div class="card-b"><div class="tl">' + x.perubahan.map(function (p) { return '<div class="tl-i on"><span class="dot">' + ikon('history') + '</span><div class="row between"><b class="small">' + esc(p.aksi) + '</b><span class="tiny muted">' + fmt.tglJam(p.waktu) + '</span></div><div class="small">' + esc(p.detail || '') + '</div><div class="tiny muted">' + esc(p.email) + '</div></div>'; }).join('') + '</div></div></div>' : '') + '</div></div>';
        if ($('#muatFoto')) $('#muatFoto').onclick = function () {
          var b = this; b.classList.add('loading');
          Promise.all(x.foto.map(function (f) { return ambilFoto(x.id, f.slot).then(function (u) { var s = $('#fotoK [data-s="' + f.slot + '"]'); if (s) s.insertAdjacentHTML('afterbegin', '<img src="' + u + '" alt="">'); }); })).then(function () { b.remove(); }, function (e) { b.classList.remove('loading'); App.toast(e.message, 'bad'); });
        };
        if ($('#fT')) $('#fT').onsubmit = function (e) {
          e.preventDefault(); var f = this, d = UI.Form.data(f); d.id = x.id;
          var go = function () { UI.Form.muat(f.querySelector('button'), App.api('etle.tindak', d)).then(function (r) { App.toast('Tindak lanjut dicatat. Status: ' + r.status + '.', 'ok'); muat(true); App.swr('etle.list', {}, { fresh: true }).catch(function () {}); }, function (er) { App.toast(er.message, 'bad'); }); };
          if (d.jenis === 'Selesai') UI.Modal.konfirm('Tandai kasus <b>Selesai</b>? Blokir kartu SIMAU untuk ' + esc(x.nopol) + ' terbuka bila tidak ada kasus/sanksi lain.', { ok: 'Tandai selesai' }).then(function (ok) { if (ok) go(); }); else go();
        };
        if ($('#surat')) $('#surat').onclick = function () { UI.Modal.buka({ judul: 'Surat ' + x.nomor, lebar: 'lebar', isi: '<div id="spM"></div>', onBuka: function (p) { suratPanel($('#spM', p), x.id); }, tombol: [{ l: 'Tutup' }] }); };
        if ($('#batal')) $('#batal').onclick = function () {
          UI.Modal.konfirm('Batalkan surat <b>' + esc(x.nomor) + '</b>? Nomor tidak akan dipakai ulang dan tindakan tercatat di log audit.', { judul: 'Batalkan kasus', ok: 'Batalkan kasus', bahaya: true, alasan: 'Alasan pembatalan' }).then(function (a) {
            if (a) App.api('etle.batal', { id: x.id, alasan: a }).then(function (r) { App.toast('Kasus dibatalkan.', 'ok'); muat(true); App.swr('etle.list', {}, { fresh: true }).catch(function () {}); }, function (e) { App.toast(e.message, 'bad'); });
          });
        };
        if ($('#koreksi')) $('#koreksi').onclick = function () {
          var F = [{ k: 'nopol', l: 'Nomor polisi', mono: true, maks: 12 }, { k: 'jenis_kendaraan', l: 'Jenis kendaraan', t: 'select', opsi: B.jenisKendaraan }, { k: 'merek_warna', l: 'Merek / warna' }, { k: 'nama_pemilik', l: 'Pemilik / pengemudi' },
            { k: 'wilayah', l: 'Kecamatan', t: 'select', opsi: B.kecamatan, kosong: '—' }, { k: 'lokasi_teks', l: 'Lokasi', full: true }, { k: 'id_jenis', l: 'Jenis pelanggaran', t: 'select', full: true, opsi: B.jenis.map(function (j) { return { v: j.id, l: j.pasal + ' — ' + j.singkat }; }) },
            { k: 'sanksi_dikenakan', l: 'Sanksi (pisahkan dengan ;)', full: true }, { k: 'keterangan', l: 'Keterangan', t: 'textarea', rows: 2 }, { k: 'no_bukti_uji', l: 'Nomor bukti uji' }, { k: 'masa_berlaku_uji', l: 'Masa berlaku uji', t: 'date' },
            { k: 'alasan', l: 'Alasan koreksi (wajib, tercatat di log)', t: 'textarea', rows: 2, wajib: true }];
          var awal = { nopol: x.nopol, jenis_kendaraan: x.jenisKendaraan, merek_warna: x.merekWarna, nama_pemilik: x.namaPemilik, wilayah: x.wilayah, lokasi_teks: x.lokasi, id_jenis: x.idJenis, sanksi_dikenakan: x.sanksi.join(';'), keterangan: x.keterangan, no_bukti_uji: x.noBuktiUji, masa_berlaku_uji: x.masaBerlakuUji };
          UI.Modal.buka({ judul: 'Koreksi ' + x.nomor, lebar: 'lebar', isi: '<div class="note warn" style="margin-bottom:12px">' + ikon('info') + '<div class="small">Hanya kolom yang berubah yang dikirim. Nilai lama dan baru tercatat di log audit.</div></div><form id="fKor">' + UI.Form.bangun(F, awal) + '</form>',
            tombol: [{ l: 'Batal' }, { l: 'Simpan koreksi', cls: 'btn-primary', aksi: function (b, p) {
              var f = $('#fKor', p); if (!UI.Form.wajib(f)) return false;
              var d = UI.Form.data(f), ubah = {};
              Object.keys(awal).forEach(function (k) { if (String(d[k] || '') !== String(awal[k] || '')) ubah[k] = d[k]; });
              if (!Object.keys(ubah).length) { App.toast('Tidak ada kolom yang berubah.', 'warn'); return false; }
              if (d.alasan.trim().length < 5) { App.toast('Alasan minimal 5 karakter.', 'warn'); return false; }
              return App.api('etle.koreksi', { id: x.id, perubahan: ubah, alasan: d.alasan }).then(function () { App.toast('Koreksi tersimpan.', 'ok'); muat(true); App.swr('etle.list', {}, { fresh: true }).catch(function () {}); });
            } }] });
        };
      } }).catch(function (e) { if (hidup()) $('#dk').innerHTML = '<div class="card">' + galat(e) + '</div>'; });
    }
    boot().then(function () { muat(); }, function (e) { $('#dk').innerHTML = '<div class="card">' + galat(e) + '</div>'; });
  }

  function peta(el) {
    var hidup = Shell.hidup(), map = null, lapis = null, hari = fmt.hariIni();
    el.innerHTML = Shell.judul(el, { eyebrow: 'Analisis', h: 'Peta Sebaran', p: 'Titik dari koordinat GPS saat pencatatan (kasus tanpa GPS dihitung per kecamatan). Draf dan kasus dibatalkan tidak ditampilkan.' }) +
      '<form class="card card-b row wrap-row" id="fP" style="align-items:flex-end"><div class="field"><label>Dari</label><input class="inp" type="date" name="dari" value="' + hari.slice(0, 5) + '01-01"></div><div class="field"><label>Sampai</label><input class="inp" type="date" name="sampai" value="' + hari + '"></div><button class="btn btn-primary">' + ikon('filter_alt') + 'Terapkan</button><div class="grow small muted" id="info"></div></form>' +
      '<div class="grid" style="grid-template-columns:minmax(0,1fr) 300px;gap:16px;margin-top:16px;align-items:start" id="gp"><div class="card"><div id="map" style="height:520px;border-radius:var(--r-lg);display:grid;place-items:center" class="muted small">Memuat peta…</div></div><div class="card"><div class="card-h"><h3>Per kecamatan</h3></div><div class="card-b" id="kec"></div></div></div>';
    if (window.innerWidth < 1100) $('#gp').style.gridTemplateColumns = 'minmax(0,1fr)';
    UI.Peta.buat($('#map'), -1.2420, 116.8940, 12).then(function (m) { if (!hidup()) { m.remove(); return; } map = m; lapis = window.L.layerGroup().addTo(m); muat(); }, function (e) { $('#map').textContent = e.message; muat(); });
    function muat() {
      var p = UI.Form.data($('#fP'));
      App.swr('etle.peta', p, { maxAge: 60000, onData: function (d) {
        if (!hidup()) return;
        var gps = d.filter(function (x) { return x.lat && x.lng; }), pk = {};
        d.forEach(function (x) { pk[x.wilayah || '(tanpa kecamatan)'] = (pk[x.wilayah || '(tanpa kecamatan)'] || 0) + 1; });
        $('#info').textContent = d.length + ' kasus · ' + gps.length + ' dengan titik GPS';
        UI.Chart.batangH($('#kec'), { item: Object.keys(pk).map(function (k) { return { l: k, n: pk[k] }; }).sort(function (a, b) { return b.n - a.n; }) });
        if (!map) return; lapis.clearLayers(); var b = [];
        gps.forEach(function (x) { b.push([x.lat, x.lng]); window.L.circleMarker([x.lat, x.lng], { radius: 7, color: '#fff', weight: 2, fillColor: WARNA[x.status] || '#0F3B67', fillOpacity: .9 }).addTo(lapis).bindPopup('<b>' + esc(x.nopol) + '</b><br>' + esc(x.jenis) + '<br>' + esc(x.lokasi || '') + '<br>' + esc(x.tgl) + ' · ' + esc(x.status) + '<br><a href="#/kasus?id=' + encodeURIComponent(x.id) + '">Detail</a>'); });
        if (b.length) map.fitBounds(b, { padding: [30, 30], maxZoom: 15 });
      } }).catch(function (e) { if (hidup()) App.toast(e.message, 'bad'); });
    }
    $('#fP').onsubmit = function (e) { e.preventDefault(); muat(); };
    return function () { if (map) { map.remove(); map = null; } };
  }

  function rekap(el) {
    var hidup = Shell.hidup(), hari = fmt.hariIni(), terakhir = null;
    el.innerHTML = Shell.judul(el, { eyebrow: 'Analisis', h: 'Rekap & Laporan', p: 'Rekap berdasarkan tanggal terbit. Ekspor Excel memuat seluruh baris pada rentang ini.' }) +
      '<form class="card card-b row wrap-row" id="fR" style="align-items:flex-end"><div class="field"><label>Dari</label><input class="inp" type="date" name="dari" value="' + hari.slice(0, 8) + '01"></div><div class="field"><label>Sampai</label><input class="inp" type="date" name="sampai" value="' + hari + '"></div><button class="btn btn-primary">' + ikon('table_view') + 'Tampilkan</button><button type="button" class="btn btn-outline" id="xl" disabled>' + ikon('download') + 'Excel</button></form>' +
      '<div id="hr" style="margin-top:16px"></div>';
    $('#fR').onsubmit = function (e) {
      e.preventDefault(); var p = UI.Form.data(this);
      $('#hr').innerHTML = '<div class="card">' + UI.sk.baris(8) + '</div>';
      UI.Form.muat(this.querySelector('.btn-primary'), App.api('etle.rekap', p)).then(function (d) {
        if (!hidup()) return; terakhir = { d: d, p: p }; $('#xl').disabled = false;
        var ks = function (o) { return Object.keys(o).map(function (k) { return { l: k, n: o[k] }; }).sort(function (a, b) { return b.n - a.n; }); };
        $('#hr').innerHTML = '<div class="grid g4">' + ['Terbit', 'Tindak Lanjut', 'Selesai', 'Dibatalkan'].map(function (s) { return '<div class="card stat" style="border-left:4px solid ' + WARNA[s] + '"><div class="lbl">' + s + '</div><div class="val">' + (d.perStatus[s] || 0) + '</div></div>'; }).join('') + '</div>' +
          '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>Per kecamatan</h3></div><div class="card-b" id="r1"></div></div><div class="card"><div class="card-h"><h3>Per pasal</h3></div><div class="card-b" id="r2"></div></div></div>' +
          '<div class="card" style="margin-top:16px"><div class="card-h"><h3>' + d.baris.length + ' surat</h3></div><div id="r3"></div></div>';
        UI.Chart.batangH($('#r1'), { item: ks(d.perKecamatan) }); UI.Chart.batangH($('#r2'), { item: ks(d.perJenis) });
        UI.Tabel($('#r3'), { cari: 'Cari…', perHal: 15, data: d.baris, kolom: [{ k: 'terbit', l: 'Terbit', f: function (r) { return fmt.tgl(r.terbit); } }, { k: 'nomor', l: 'Nomor', cls: 'mono small' }, { k: 'nopol', l: 'Nopol', f: function (r) { return App.plat(r.nopol); } }, { k: 'pasal', l: 'Pasal' }, { k: 'wilayah', l: 'Kecamatan' }, { k: 'status', l: 'Status', f: function (r) { return App.badge(r.status); } }] });
      }, function (er) { $('#hr').innerHTML = '<div class="card">' + galat(er) + '</div>'; });
    };
    $('#xl').onclick = function () {
      if (!terakhir) return; var d = terakhir.d;
      App.Xlsx.unduh('Rekap-ETLE-' + terakhir.p.dari + '_' + terakhir.p.sampai, [
        { nama: 'Surat', kolom: ['Nomor', 'Terbit', 'Status', 'Nopol', 'Jenis Kendaraan', 'Pasal', 'Pelanggaran', 'Sanksi', 'Kecamatan', 'Lokasi', 'Petugas', 'Alasan Batal'], baris: d.baris.map(function (r) { return [r.nomor, r.terbit, r.status, r.nopol, r.jenisKendaraan, r.pasal, r.jenis, r.sanksi, r.wilayah, r.lokasi, r.petugas, r.alasanBatal]; }) },
        { nama: 'Per Kecamatan', kolom: ['Kecamatan', 'Jumlah'], baris: Object.keys(d.perKecamatan).map(function (k) { return [k, d.perKecamatan[k]]; }) },
        { nama: 'Per Pasal', kolom: ['Pasal', 'Jumlah'], baris: Object.keys(d.perJenis).map(function (k) { return [k, d.perJenis[k]]; }) }]);
    };
    $('#fR').requestSubmit ? $('#fR').requestSubmit() : $('#fR').onsubmit(new Event('submit'));
  }

  function master(el) {
    var hidup = Shell.hidup(), tbl = null;
    el.innerHTML = Shell.judul(el, { eyebrow: 'Referensi', h: 'Master Jenis Pelanggaran', p: 'Dasar: Perda Kota Balikpapan No. 7 Tahun 2022. Jenis yang sudah dipakai kasus tidak dihapus; nonaktifkan bila tidak berlaku.', aksi: '<button class="btn btn-primary" id="tambah">' + ikon('add') + 'Tambah jenis</button>' }) + '<div class="card" id="t">' + UI.sk.baris(8) + '</div>';
    function muat(fresh) {
      return App.swr('etle.master.list', {}, { maxAge: 60000, fresh: fresh, onData: function (d) {
        if (!hidup()) return;
        if (!tbl) tbl = UI.Tabel($('#t'), { cari: 'Cari pasal, uraian…', perHal: 25, data: d,
          kolom: [{ k: 'pasal', l: 'Pasal', cls: 'mono' }, { k: 'singkat', l: 'Nama singkat', f: function (r) { return '<b>' + esc(r.singkat || '') + '</b><div class="tiny muted">' + esc(String(r.uraian || '').slice(0, 90)) + '</div>'; } }, { k: 'kategori', l: 'Kategori' },
            { k: 'opsi', l: 'Opsi sanksi', f: function (r) { return '<span class="small">' + r.opsi.length + ' opsi</span>' + (r.perluUji ? ' <span class="badge b-info">bukti uji</span>' : ''); } }, { k: 'dipakai', l: 'Dipakai', cls: 'right' }, { k: 'aktif', l: 'Status', f: function (r) { return r.aktif ? App.badge('Aktif', 'b-ok') : App.badge('Nonaktif', 'b-slate'); } }],
          onRow: form, kosong: { ikon: 'menu_book', judul: 'Master masih kosong', teks: 'Impor dari E-Tilang lama (Migrasi Data) atau tambah manual.' } });
        else tbl.setData(d);
      } }).catch(function (e) { if (hidup()) $('#t').innerHTML = galat(e); });
    }
    function form(r) {
      var baru = !r; r = r || { aktif: true, opsi: [] };
      UI.Modal.buka({ judul: baru ? 'Tambah jenis pelanggaran' : 'Ubah ' + r.pasal, lebar: 'lebar',
        isi: '<form id="fJ">' + UI.Form.bangun([{ k: 'pasal', l: 'Pasal Perda', wajib: true, ph: 'Pasal 57 ayat (1) huruf c' }, { k: 'kategori', l: 'Kategori', ph: 'Parkir, Angkutan, …' },
          { k: 'singkat', l: 'Nama singkat (maks. 40 karakter, tampil di HP petugas)', full: true, maks: 40, wajib: true }, { k: 'uraian', l: 'Uraian ketentuan', t: 'textarea', rows: 4, wajib: true },
          { k: 'sanksi', l: 'Sanksi menurut Perda', t: 'textarea', rows: 2 }, { k: 'opsiTeks', l: 'Opsi sanksi lapangan (satu per baris)', t: 'textarea', rows: 4, wajib: true },
          { k: 'perluUji', l: 'Wajib bukti uji (nomor, masa berlaku, foto)', t: 'switch' }, { k: 'aktif', l: 'Aktif (tampil di HP petugas)', t: 'switch' }, { k: 'catatan', l: 'Catatan internal', t: 'textarea', rows: 2 }],
          { pasal: r.pasal, kategori: r.kategori, singkat: r.singkat, uraian: r.uraian, sanksi: r.sanksi, opsiTeks: r.opsi.join('\n'), perluUji: r.perluUji ? 'YA' : 'TIDAK', aktif: r.aktif ? 'YA' : 'TIDAK', catatan: r.catatan }) + '</form>',
        tombol: [{ l: 'Batal' }, { l: 'Simpan', cls: 'btn-primary', aksi: function (b, p) {
          var f = $('#fJ', p); if (!UI.Form.wajib(f)) return false;
          var d = UI.Form.ambil(f), row = { pasal: d.pasal, kategori: d.kategori, singkat: d.singkat, uraian: d.uraian, sanksi: d.sanksi, catatan: d.catatan, opsi: d.opsiTeks.split('\n').map(function (s) { return s.trim(); }).filter(String), perluUji: d.perluUji === 'YA', aktif: d.aktif === 'YA' };
          if (!baru) row.id = r.id;
          return App.api('etle.master.simpan', { row: row }).then(function () { App.toast('Tersimpan.', 'ok'); muat(true); App.swr('etle.boot', {}, { fresh: true }).then(function (x) { B = x; }, function () {}); });
        } }] });
    }
    $('#tambah').onclick = function () { form(null); };
    muat();
  }

  function pengaturan(el) {
    var hidup = Shell.hidup(), sa = me.role === 'Superadmin';
    el.innerHTML = Shell.judul(el, { eyebrow: 'Konfigurasi', h: 'Pengaturan ETLE', p: 'Kop surat juga dipakai Kartu Pengawasan SIMAU dan laporan.' }) + '<div id="fS">' + UI.sk.baris(10) + '</div>';
    App.swr('etle.pengaturan', {}, { maxAge: 60000, onData: function (s) {
      if (!hidup()) return;
      $('#fS').innerHTML = '<form id="fSet" class="stack-lg" style="max-width:900px"><div class="card"><div class="card-h"><h3>' + ikon('description') + 'Kop surat</h3></div><div class="card-b">' +
        '<div class="note" style="margin-bottom:12px">' + ikon('image') + '<div class="small">Logo kop (kiri dan kanan) diganti di <b>Panel Konten → Logo</b>' + (['Superadmin', 'Admin Konten'].indexOf(me.role) > -1 ? ' — <a href="' + App.ROOT + 'konten/#/logo">buka</a>' : ' oleh Superadmin atau Admin Konten') + '.</div></div>' +
        UI.Form.bangun([{ k: 'nama_dinas', l: 'Nama dinas', full: true }, { k: 'nama_bidang', l: 'Nama bidang', full: true }, { k: 'alamat_kop', l: 'Alamat', full: true }, { k: 'telp_kop', l: 'Telepon' }], s.kop) + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>' + ikon('draw') + 'Surat penindakan</h3></div><div class="card-b">' + UI.Form.bangun([{ k: 'format_nomor', l: 'Format nomor', mono: true, full: true, atr: ' style="text-transform:none"', hint: 'Wajib memuat {seq}. Tersedia {rom} (bulan Romawi), {bulan}, {tahun}. Nomor urut tidak pernah dipakai ulang.' },
          { k: 'pejabat_jabatan', l: 'Jabatan penandatangan', full: true }, { k: 'pejabat_nama', l: 'Nama pejabat' }, { k: 'pejabat_nip', l: 'NIP', mono: true },
          { k: 'url_cek_status', l: 'URL cek status (opsional)', full: true, ph: 'kosongkan = otomatis memakai alamat situs', hint: 'Dipakai pada QR surat. Harus diawali https://' }], s) + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>' + ikon('public') + 'Situs publik</h3></div><div class="card-b">' + UI.Form.bangun([{ k: 'modul_etle_publik', l: 'Tampilkan tab "Surat Tilang" di Cek Status situs publik', t: 'switch', hint: sa ? '' : 'Hanya Superadmin yang dapat mengubah.', atr: sa ? '' : ' disabled' }], s.kop) + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>' + ikon('notifications_off') + 'Notifikasi WhatsApp</h3><span class="badge b-slate">Terkunci</span></div><div class="card-b"><div class="note">' + ikon('lock') + '<div class="small">Notifikasi ke pelanggar belum boleh diaktifkan sampai ada ketetapan Bagian Hukum (PRD R3). Modul pengiriman belum dipasang di versi 1.0.0.</div></div></div></div>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn btn-primary">' + ikon('save') + 'Simpan pengaturan</button></div></form>' +
        (sa ? '<div class="card" style="max-width:900px;margin-top:24px;border-color:var(--bad)"><div class="card-h"><h3 style="color:var(--bad-tx)">' + ikon('delete_forever') + 'Reset data uji</h3></div><div class="card-b stack"><p class="small">Menghapus semua kasus dan tindak lanjut ETLE (dipakai setelah masa uji coba). Master, pengaturan, dan nomor urut surat tetap — nomor tidak akan dipakai ulang.</p><div><button class="btn btn-danger" id="reset">Reset data uji ETLE</button></div></div></div>' : '');
      $('#fSet').onsubmit = function (e) {
        e.preventDefault(); var d = UI.Form.ambil(this);
        var set = { format_nomor: d.format_nomor, pejabat_jabatan: d.pejabat_jabatan, pejabat_nama: d.pejabat_nama, pejabat_nip: d.pejabat_nip, url_cek_status: d.url_cek_status, kop: { nama_dinas: d.nama_dinas, nama_bidang: d.nama_bidang, alamat_kop: d.alamat_kop, telp_kop: d.telp_kop } };
        if (sa) set.kop.modul_etle_publik = d.modul_etle_publik;
        UI.Form.muat(this.querySelector('.btn-primary'), App.api('etle.pengaturan.simpan', { set: set })).then(function () { App.toast('Pengaturan tersimpan.', 'ok'); App.swr('etle.pengaturan', {}, { fresh: true }).catch(function () {}); }, function (er) { App.toast(er.message, 'bad'); });
      };
      if ($('#reset')) $('#reset').onclick = function () {
        UI.Modal.konfirm('Hapus <b>semua</b> kasus ETLE uji coba? Tindakan ini tidak dapat dibatalkan.', { judul: 'Reset data uji', ok: 'Hapus data uji', bahaya: true, ketik: 'HAPUS DATA UJI' }).then(function (ok) {
          if (ok) App.api('etle.reset', { konfirmasi: 'HAPUS DATA UJI' }).then(function (r) { App.toast(r.dihapus + ' baris dihapus.', 'ok'); }, function (er) { App.toast(er.message, 'bad'); });
        });
      };
    } }).catch(function (e) { if (hidup()) $('#fS').innerHTML = '<div class="card">' + galat(e) + '</div>'; });
  }

  function log(el, args, q) {
    var hidup = Shell.hidup(), jenis = ['audit', 'login', 'cek'].indexOf(q.get('j')) > -1 ? q.get('j') : 'audit';
    el.innerHTML = Shell.judul(el, { eyebrow: 'Keamanan', h: 'Log Aktivitas', p: 'Menampilkan hingga 3.000 entri terbaru. Data rahasia (token, sandi) tidak pernah dicatat.' }) +
      '<div class="tabs" style="margin-bottom:16px">' + [['audit', 'Audit perubahan'], ['login', 'Login'], ['cek', 'Cek publik']].map(function (j) { return '<a href="#/log?j=' + j[0] + '" class="' + (j[0] === jenis ? 'on' : '') + '">' + j[1] + '</a>'; }).join('') + '</div><div class="card" id="t">' + UI.sk.baris(10) + '</div>';
    App.api('log.list', { jenis: jenis }).then(function (d) {
      if (!hidup()) return;
      var data = d.baris.map(function (r) { var o = {}; d.kolom.forEach(function (k, i) { o[k] = r[i]; }); return o; });
      UI.Tabel($('#t'), { cari: 'Cari email, aksi, detail…', perHal: 25, data: data, kolom: d.kolom.map(function (k, i) { return { k: k, l: k.replace(/_/g, ' '), f: i === 0 ? function (r) { return '<span class="small">' + fmt.tglJam(r[k]) + '</span>'; } : function (r) { return '<span class="small">' + esc(String(r[k] || '').slice(0, 160)) + '</span>'; } }; }), kosong: { ikon: 'receipt_long', judul: 'Log kosong' } });
    }, function (e) { if (hidup()) $('#t').innerHTML = galat(e); });
  }

  function desktop() {
    Shell.mulai({
      modul: 'etle', judul: 'ETLE DISHUB', sub: 'Kota Balikpapan', judulPendek: 'ETLE', peran: ADM, awal: 'dashboard',
      cari: { ph: 'Cari nopol atau nomor surat…', onCari: function (v) { location.hash = '#/kasus?q=' + encodeURIComponent(v); } },
      menu: [
        { grp: 'Ringkasan', item: [{ h: '#/dashboard', l: 'Dashboard', i: 'dashboard' }] },
        { grp: 'Penindakan', item: [{ h: '#/kasus', l: 'Semua Kasus', i: 'assignment' }, { h: '#/peta', l: 'Peta Sebaran', i: 'map' }, { h: '#/rekap', l: 'Rekap & Laporan', i: 'summarize' }] },
        { grp: 'Referensi', item: [{ h: '#/master', l: 'Jenis Pelanggaran', i: 'menu_book' }, { h: '#/pengaturan', l: 'Pengaturan', i: 'tune' }] },
        { grp: 'Keamanan', item: [{ h: '#/log', l: 'Log Aktivitas', i: 'receipt_long' }, { h: '#/akun', l: 'Kelola Akun', i: 'manage_accounts' }, { h: '#/sistem', l: 'Sistem & Keamanan', i: 'shield', peran: SA }, { h: '#/impor', l: 'Migrasi Data', i: 'sync_alt', peran: SA }] }
      ],
      rute: {
        dashboard: dashboard, kasus: function (el, a, q) { semuaKasus(el, a, q); if (q.get('q')) setTimeout(function () { var i = $('[data-q]', el); if (i) { i.value = q.get('q'); i.dispatchEvent(new Event('input')); } }, 60); },
        peta: peta, rekap: rekap, master: master, pengaturan: pengaturan, log: log, akun: Shell.halAkun, sistem: Shell.halSistem, impor: Shell.halImpor
      },
      prefetch: function () { ['etle.list', 'etle.master.list', 'etle.pengaturan'].forEach(function (a) { App.swr(a, {}, { maxAge: 30000 }).catch(function () {}); }); }
    });
    boot().catch(function () {});
  }

  // ------------------------------------------------------------------ MULAI
  if (!sesi) { App.Sesi.habis('Silakan masuk untuk membuka ETLE Dishub.'); return; }
  if (me.role === PL || (App.q('m') === '1' && ADM.indexOf(me.role) > -1)) mobile();
  else desktop();
  App.daftarSW('sw.js');
})();
