/**
 * landing.js — Modul A: Landing Page Publik (tanpa login) + halaman Masuk.
 * Rute hash: #/ · #/profil/<sub> · #/berita[/id] · #/pengumuman · #/regulasi · #/pengaduan
 *            #/cek?tab=kendaraan|surat|tiket · #/survei · #/statistik · #/masuk · #/masuk-darurat
 * Beranda dua tahap: kerangka statis tampil dulu, data dari cache lokal (instan) lalu disegarkan.
 */
(function () {
  'use strict';
  var esc = App.esc, ikon = App.ikon, fmt = App.fmt, $ = App.$, $$ = App.$$;
  var APP = $('#app'), BOOT = null, ETLE_ON = true;

  // ------------------------------------------------------------------ data bersama
  var BOOT_DIMINTA = false;
  function muatBoot(cb, onErr) {
    BOOT_DIMINTA = true;
    return App.swr('publik.boot', {}, { maxAge: 300000, onData: function (d) { BOOT = d; ETLE_ON = d.konfig.modulEtlePublik; terapBoot(d); if (cb) cb(d); } })
      .catch(function (e) {
        var t = $('#ticker .txt'); if (t && !BOOT) t.textContent = 'Informasi belum dapat dimuat.';
        if (onErr && !BOOT) onErr(e);
      });
  }
  function terapBoot(d) {
    var t = $('#ticker .txt');
    if (d.ticker.length) t.innerHTML = '<a href="#/pengumuman" style="color:inherit">' + esc(d.ticker.map(function (x) { return x.judul; }).join('  •  ')) + '</a>';
    else t.textContent = 'Belum ada pengumuman terbaru.';
    t.classList.remove('muted');
    var k = d.kontak || {};
    $('#fAlamat').textContent = k.kontak_alamat || d.konfig.namaDinas;
    $('#fJam').textContent = k.kontak_jam ? 'Jam layanan: ' + k.kontak_jam : '';
    $('#fTelp').textContent = k.kontak_telepon ? 'Telepon: ' + k.kontak_telepon : '';
    $('#fEmail').textContent = k.kontak_email || '';
    if (k.kontak_whatsapp) { var wa = $('#fWa'); wa.href = 'https://wa.me/62' + String(k.kontak_whatsapp).replace(/^0/, ''); wa.classList.remove('hide'); }
    if (k.kontak_peta) { var p = $('#fPeta'); p.href = k.kontak_peta; p.classList.remove('hide'); }
    if (d.konfig.namaBidang) $('#namaBidang').textContent = d.konfig.namaBidang;
  }
  function halamanData(onData) { return App.swr('publik.halaman', {}, { maxAge: 600000, onData: onData }); }
  function gagal(e) { return '<div class="note bad">' + ikon('error') + '<div>' + esc(e.message || e) + '</div></div>'; }
  function pageH(eyebrow, judul, p) { return '<section class="page-h"><div class="wrap"><div class="eyebrow">' + esc(eyebrow) + '</div><h1 style="margin-top:8px">' + esc(judul) + '</h1>' + (p ? '<p>' + p + '</p>' : '') + '</div></section>'; }

  // ------------------------------------------------------------------ BERANDA
  /**
   * Beranda. Bagian hero (judul besar = elemen LCP) sudah ada di index.html (data-statis) persis sama dengan markah di
   * bawah. Pada kunjungan pertama hero itu DIPAKAI, tidak digambar ulang, sehingga judul tampil sejak HTML diterima
   * dan tidak ada pergeseran tampilan. Bila markah hero diubah di sini, ubah juga di index.html (diuji tools/uji-132-ui.py).
   */
  function beranda() {
    var html =
      '<section class="hero"><div class="wrap"><div><div class="eyebrow">Pelayanan publik transportasi</div><h1>Layanan Sarana Transportasi Kota Balikpapan</h1>' +
      '<p>Pengaduan masyarakat, cek status kendaraan angkutan umum, dan informasi sarana transportasi dalam satu pintu.</p>' +
      '<div class="row wrap-row" style="margin-top:22px"><a class="btn btn-amber btn-lg" href="#/pengaduan">' + ikon('campaign') + 'Buat Pengaduan</a><a class="btn btn-white btn-lg" href="#/cek">' + ikon('fact_check') + 'Cek Status</a></div></div>' +
      '<div class="pejabat" id="pejabat"><div class="kepala"><div class="eyebrow">Sambutan</div></div><div class="row"><div class="foto">' + ikon('person') + '</div><div class="grow"><div class="sk sk-line" style="width:70%"></div><div class="sk sk-line" style="width:50%"></div></div></div><div class="sk sk-line" style="margin-top:16px"></div><div class="sk sk-line" style="width:80%"></div></div></div></section>' +
      '<div class="wrap cekcepat"><div class="card"><div class="card-b"><div class="row between wrap-row" style="margin-bottom:14px"><h2 class="h3">' + ikon('manage_search') + ' Cek Cepat</h2><div class="seg" id="ccTab"><button type="button" class="on" data-t="kendaraan">' + ikon('directions_bus') + 'Kendaraan</button>' + (ETLE_ON ? '<button type="button" data-t="surat">' + ikon('gavel') + 'Surat Tilang</button>' : '') + '</div></div><div id="ccForm"></div></div></div></div><div class="wrap" id="pasangK" style="margin-top:16px"></div>' +
      '<section class="sec"><div class="wrap"><div class="sec-h"><div class="eyebrow">Akses utama</div><h2>Layanan</h2></div><div class="grid g4 layanan">' +
      [['#/pengaduan', 'campaign', 'Form Pengaduan', 'Laporkan pelanggaran angkutan, pelayanan, atau fasilitas halte.', 'Buat aduan'],
       ['#/cek', 'fact_check', 'Cek Status', 'Periksa status kendaraan, surat penindakan, atau tiket pengaduan.', 'Lacak status'],
       ['#/regulasi', 'gavel', 'Regulasi', 'Peraturan daerah dan ketentuan penyelenggaraan transportasi.', 'Unduh peraturan'],
       ['#/survei', 'reviews', 'Survei Layanan', 'Beri penilaian untuk meningkatkan mutu pelayanan.', 'Isi survei']].map(function (x) {
        return '<a class="card hover" href="' + x[0] + '"><span class="ic">' + ikon(x[1]) + '</span><h3>' + x[2] + '</h3><p>' + x[3] + '</p><span class="go">' + x[4] + ikon('arrow_forward') + '</span></a>';
      }).join('') + '</div></div></section>' +
      '<section class="sec alt"><div class="wrap"><div class="sec-h row between wrap-row"><div><div class="eyebrow">Inventaris resmi</div><h2>Data Angkutan Umum</h2></div></div><div class="grid g4" id="angkutan" style="min-height:130px">' + UI.sk.kartu(4) + '</div></div></section>' +
      '<section class="sec" id="secPenindakan"><div class="wrap"><div class="sec-h"><div class="eyebrow">Pengawasan lapangan</div><h2>Penindakan</h2><p class="muted" style="margin-top:6px">Data agregat penindakan pelanggaran terkait kendaraan. Tidak memuat data perorangan.</p></div><div class="grid g2" id="penindakan" style="min-height:240px">' + UI.sk.kartu(2) + '</div></div></section>' +
      '<section class="sec alt"><div class="wrap"><div class="lacak"><div><div class="eyebrow" style="color:#A5C9FD">Layanan mandiri warga</div><h2>Lacak Status Pengaduan</h2><p>Masukkan kode tiket yang Anda terima saat mengirim pengaduan.</p></div>' +
      '<form id="fLacak"><input class="inp mono" name="kode" placeholder="TKT-XXXXXX" aria-label="Kode tiket" required><button class="btn btn-amber">' + ikon('search') + 'Lacak</button></form></div></div></section>' +
      '<section class="sec"><div class="wrap"><div class="sec-h row between wrap-row"><div><div class="eyebrow">Publikasi</div><h2>Berita Terbaru</h2></div><a href="#/berita" class="btn btn-ghost">Semua berita' + ikon('arrow_forward') + '</a></div><div class="grid g3 berita" id="berita" style="min-height:200px">' + UI.sk.kartu(3) + '</div></div></section>';
    var statis = document.querySelector('#app > section.hero[data-statis]');
    if (statis && APP.children.length === 1) { statis.removeAttribute('data-statis'); statis.insertAdjacentHTML('afterend', html.slice(html.indexOf('</section>') + 10)); }
    else APP.innerHTML = html;
    $('#fLacak').onsubmit = function (e) { e.preventDefault(); location.hash = '#/cek?tab=tiket&kode=' + encodeURIComponent(this.kode.value.trim()); };
    formCekCepat('kendaraan');
    $$('#ccTab button').forEach(function (b) { b.onclick = function () { formCekCepat(b.dataset.t); }; });
    App.Pasang.kartu($('#pasangK'), { kunci: 'web', hpSaja: true, teks: 'Pengaduan dan cek status langsung dari layar utama HP.' });
    // Data diambil setelah bingkai pertama tergambar: permintaan ke Apps Script (1–3 detik) tidak ikut "menahan"
    // perkiraan LCP Lighthouse, dan judul sudah tampil lebih dulu. BOOT_DIMINTA dipasang sekarang agar tidak diminta dobel.
    BOOT_DIMINTA = true;
    setelahTampil(function () { muatBoot(isiBeranda, function (e) {
      ['#angkutan', '#penindakan', '#berita'].forEach(function (s) { var el = $(s); if (el) el.innerHTML = '<div style="grid-column:1/-1">' + gagal(e) + '</div>'; });
      var pj = $('#pejabat'); if (pj) pj.innerHTML = '<div class="kepala"><div class="eyebrow">Sambutan</div></div><p class="small muted">Belum dapat dimuat.</p>';
    }); });
  }
  function setelahTampil(fn) { if (window.requestAnimationFrame) requestAnimationFrame(function () { setTimeout(fn, 0); }); else setTimeout(fn, 0); }

  function formCekCepat(t) {
    var el = $('#ccForm'); if (!el) return;
    $$('#ccTab button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    el.innerHTML = t === 'kendaraan'
      ? '<form id="fCC"><div class="field"><label>Nomor polisi kendaraan</label><div class="inp-ico">' + ikon('directions_bus') + '<input class="inp mono" name="nopol" placeholder="KT 1234 AB" maxlength="12" required></div></div><button class="btn btn-primary btn-lg">' + ikon('search') + 'Cek Kendaraan</button></form>'
      : '<form id="fCC"><div class="field"><label>Nomor surat</label><input class="inp mono" name="no" placeholder="1/ETL/DISHUB/XI/2026" required></div><div class="field"><label>Nomor polisi</label><input class="inp mono" name="nopol" placeholder="KT 1234 AB" maxlength="12" required></div><button class="btn btn-primary btn-lg">' + ikon('search') + 'Cek Surat</button></form>' +
        '<div class="hint small muted" style="margin-top:8px">Nomor surat dan nomor polisi harus cocok.</div>';
    $('#fCC').onsubmit = function (e) {
      e.preventDefault(); var f = this;
      location.hash = t === 'kendaraan' ? '#/cek?tab=kendaraan&nopol=' + encodeURIComponent(f.nopol.value.trim()) : '#/cek?tab=surat&no=' + encodeURIComponent(f.no.value.trim()) + '&nopol=' + encodeURIComponent(f.nopol.value.trim());
    };
  }

  function warnaSkala(n, max) {
    if (!n) return { bg: '#F1F5F9', fg: '#475569' };
    var t = Math.min(1, n / Math.max(1, max)), a = [211, 227, 255], b = [15, 59, 103];
    var c = a.map(function (x, i) { return Math.round(x + (b[i] - x) * (0.25 + 0.75 * t)); });
    return { bg: 'rgb(' + c.join(',') + ')', fg: t > 0.45 ? '#fff' : '#0F3B67' };
  }

  function isiBeranda(d) {
    if (!$('#angkutan')) return;
    var pj = d.pejabat;
    // Tinggi kartu tetap (CSS .pejabat): nama & jabatan maks. 2 baris, kutipan maks. 4 baris; teks lengkap di halaman Profil.
    $('#pejabat').innerHTML = '<div class="kepala"><div class="eyebrow">Sambutan</div>' + (d.sambutan ? '<a href="#/profil/sejarah">Baca lengkap</a>' : '') + '</div><div class="row">' +
      (pj && pj.foto ? '<img class="foto" src="' + esc(pj.foto) + '" alt="Foto ' + esc(pj.nama) + '" width="72" height="72" referrerpolicy="no-referrer">' : '<div class="foto">' + ikon('person') + '</div>') +
      '<div class="grow"><div class="nm">' + esc(pj ? pj.nama : d.konfig.namaDinas) + '</div><div class="jb">' + esc(pj ? pj.jabatan : '') + '</div></div></div>' +
      (d.sambutan ? '<q title="' + esc(d.sambutan.isi) + '">' + esc(d.sambutan.isi) + (d.sambutan.isi.length >= 200 ? '…' : '') + '</q>' : '');
    // Tab "Surat Tilang" sudah digambar sejak awal (bawaan aktif) agar kotak Cek Cepat tidak bergeser; dilepas bila modul dimatikan.
    var tbS = $('#ccTab [data-t="surat"]');
    if (!ETLE_ON && tbS) { if (tbS.classList.contains('on')) formCekCepat('kendaraan'); tbS.remove(); }
    else if (ETLE_ON && !tbS) {
      $('#ccTab').insertAdjacentHTML('beforeend', '<button type="button" data-t="surat">' + ikon('gavel') + 'Surat Tilang</button>');
      $$('#ccTab button').forEach(function (b) { b.onclick = function () { formCekCepat(b.dataset.t); }; });
    }
    var a = d.angkutan;
    $('#angkutan').innerHTML = [['Kendaraan Aktif', a.kendaraanAktif, 'directions_bus', 'dari ' + fmt.angka(a.kendaraanTotal) + ' kendaraan terdaftar'], ['Trayek', a.trayek, 'route', 'trayek angkutan kota'], ['Perusahaan', a.perusahaan, 'apartment', 'operator angkutan'], ['Fasilitas Halte', a.halte, 'signpost', 'halte terdata']].map(function (x) {
      return '<div class="card stat"><div class="lbl">' + x[0] + '<span class="ico">' + ikon(x[2]) + '</span></div><div class="val">' + fmt.angka(x[1]) + '</div><div class="ft">' + x[3] + '</div></div>';
    }).join('');
    if (!d.penindakan) { $('#secPenindakan').classList.add('hide'); }
    else {
      var p = d.penindakan, pk = p.perKecamatan, max = Math.max.apply(null, [1].concat(Object.keys(pk).map(function (k) { return pk[k]; })));
      var urut = ['Balikpapan Barat', 'Balikpapan Utara', 'Balikpapan Timur', 'Balikpapan Tengah', 'Balikpapan Kota', 'Balikpapan Selatan'];
      $('#penindakan').innerHTML = '<div class="stack"><div class="grid g2"><div class="card stat"><div class="lbl">Pelanggaran bulan ini<span class="ico">' + ikon('report') + '</span></div><div class="val">' + fmt.angka(p.bulanIni) + '</div></div>' +
        '<div class="card stat"><div class="lbl">Kasus selesai<span class="ico">' + ikon('task_alt') + '</span></div><div class="val">' + fmt.angka(p.selesai) + '</div><div class="ft">dari ' + fmt.angka(p.total) + ' surat terbit</div></div></div>' +
        '<div class="card card-b"><div class="lbl-f">Per kecamatan, tahun ' + esc(p.tahun) + '</div>' + urut.map(function (k) { return '<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>' + esc(k) + '</span><b class="mono">' + (pk[k] || 0) + ' kasus</b></div>'; }).join('') + '</div></div>' +
        '<div class="card card-b"><div class="row between"><h3>Sebaran per kecamatan</h3><span class="badge b-navy">' + esc(p.tahun) + '</span></div><p class="small muted" style="margin:4px 0 14px">Peta skematis, bukan batas wilayah resmi. Warna makin gelap = makin banyak kasus.</p>' +
        '<div class="kec">' + urut.map(function (k) { var w = warnaSkala(pk[k] || 0, max); return '<div style="background:' + w.bg + ';color:' + w.fg + '"><span>' + esc(k.replace('Balikpapan ', '')) + '</span><b>' + (pk[k] || 0) + '</b></div>'; }).join('') + '</div></div>';
    }
    $('#berita').innerHTML = d.berita.length ? d.berita.map(function (b) { return kartuBerita(b, 'h3'); }).join('') : '<div class="kosong card">' + ikon('newspaper') + '<h4>Belum ada berita</h4></div>';
  }
  /** lv: tingkat judul kartu — 'h3' di bawah judul bagian (Beranda), 'h2' langsung di bawah judul halaman (daftar berita). */
  function kartuBerita(b, lv) {
    lv = lv || 'h3';
    return '<a class="card hover" href="#/berita/' + encodeURIComponent(b.id) + '">' + (b.gambar ? '<img class="cover" src="' + esc(b.gambar) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<div class="cover">' + ikon('newspaper') + '</div>') +
      '<div class="isi"><div class="row small muted">' + (b.kategori ? '<span class="badge b-navy">' + esc(b.kategori) + '</span>' : '') + '<span>' + fmt.tgl(b.tanggal) + '</span></div><' + lv + ' class="h3">' + esc(b.judul) + '</' + lv + '><p>' + esc(b.ringkasan) + '</p></div></a>';
  }

  // ------------------------------------------------------------------ PROFIL
  var SUB = [['sejarah', 'Sejarah'], ['visi-misi', 'Visi dan Misi'], ['tugas-fungsi', 'Tugas dan Fungsi'], ['struktur', 'Struktur Organisasi'], ['kontak', 'Kontak']];
  function profil(args) {
    var sub = args[0] || 'sejarah', label = (SUB.filter(function (s) { return s[0] === sub; })[0] || SUB[0])[1];
    APP.innerHTML = pageH('Profil', label) + '<div class="wrap"><div class="tabs" style="margin-bottom:24px">' + SUB.map(function (s) { return '<a href="#/profil/' + s[0] + '" class="' + (s[0] === sub ? 'on' : '') + '">' + s[1] + '</a>'; }).join('') +
      '</div><div id="isiProfil" style="min-height:300px;padding-bottom:56px">' + UI.sk.baris(8) + '</div></div>';
    halamanData(function (d) { var el = $('#isiProfil'); if (el) el.innerHTML = renderProfil(sub, d); }).catch(function (e) { $('#isiProfil').innerHTML = gagal(e); });
  }
  function renderProfil(sub, d) {
    var kosong = function (t) { return '<div class="kosong card">' + ikon('edit_note') + '<h4>' + t + '</h4><div>Isi dikelola melalui Panel Konten.</div></div>'; };
    if (sub === 'sejarah') {
      var pr = d.teks.Profil, sj = d.teks.Sejarah;
      if (!pr && !sj) return kosong('Belum ada teks profil dan sejarah');
      return '<div class="stack-lg" style="max-width:860px">' + (pr ? '<div><h2>' + esc(pr.judul || 'Profil') + '</h2><div class="prose" style="margin-top:10px">' + esc(pr.isi) + '</div></div>' : '') +
        (sj ? '<div><h2>' + esc(sj.judul || 'Sejarah') + '</h2><div class="prose" style="margin-top:10px">' + esc(sj.isi) + '</div></div>' : '') + '</div>';
    }
    if (sub === 'visi-misi') {
      if (!d.poin.Visi.length && !d.poin.Misi.length) return kosong('Belum ada visi dan misi');
      return '<div class="stack-lg" style="max-width:860px"><div><div class="eyebrow" style="margin-bottom:10px">Visi</div>' + d.poin.Visi.map(function (v) { return '<div class="visi">' + esc(v) + '</div>'; }).join('<div style="height:10px"></div>') + '</div>' +
        '<div><div class="eyebrow" style="margin-bottom:6px">Misi</div><ol class="misi">' + d.poin.Misi.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol></div></div>';
    }
    if (sub === 'tugas-fungsi') {
      if (!d.poin.Tugas.length && !d.poin.Fungsi.length) return kosong('Belum ada tugas dan fungsi');
      return '<div class="grid g2">' + ['Tugas', 'Fungsi'].map(function (j) { return '<div class="card card-b"><h2>' + j + '</h2><ol class="misi" style="margin-top:10px">' + d.poin[j].map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol></div>'; }).join('') + '</div>';
    }
    if (sub === 'struktur') return renderStruktur(d) || kosong('Belum ada data pejabat');
    var k = d.kontak || {};
    return '<div class="grid g2"><div class="stack">' + [['location_on', 'Alamat', k.kontak_alamat], ['call', 'Telepon', k.kontak_telepon], ['chat', 'WhatsApp', k.kontak_whatsapp], ['mail', 'Email', k.kontak_email], ['schedule', 'Jam layanan', k.kontak_jam]].filter(function (x) { return x[2]; }).map(function (x) {
      return '<div class="card card-b row">' + '<span class="stat"><span class="ico" style="display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:var(--tint);color:var(--navy)">' + ikon(x[0]) + '</span></span><div><div class="small muted">' + x[1] + '</div><b>' + esc(x[2]) + '</b></div></div>';
    }).join('') + (k.kontak_whatsapp ? '<a class="btn btn-primary" target="_blank" rel="noopener" href="https://wa.me/62' + esc(String(k.kontak_whatsapp).replace(/^0/, '')) + '">' + ikon('chat') + 'Hubungi lewat WhatsApp</a>' : '') + '</div>' +
      '<div class="card card-b center stack"><div style="font-size:48px">' + ikon('map') + '</div><h3>Lokasi kantor</h3>' + (k.kontak_peta ? '<a class="btn btn-outline" href="' + esc(k.kontak_peta) + '" target="_blank" rel="noopener">' + ikon('open_in_new') + 'Lihat lokasi di peta</a>' : '<p class="muted">Tautan peta belum diisi.</p>') + '</div></div>';
  }
  function nodeOrg(p, kepala) {
    return '<div class="node' + (kepala ? ' kepala' : '') + '">' + (p.foto ? '<img src="' + esc(p.foto) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<div class="av">' + ikon('person') + '</div>') + '<b>' + esc(p.nama) + '</b><span>' + esc(p.jabatan) + '</span></div>';
  }
  function renderStruktur(d) {
    if (!d.pejabat.length) return '';
    var kepala = d.pejabat.filter(function (p) { return p.level === 1; }), kasi = d.pejabat.filter(function (p) { return p.level !== 1; });
    var unitKasi = kasi.map(function (k) { return k.unit; });
    var lain = d.pegawai.filter(function (s) { return unitKasi.indexOf(s.unit) === -1; });
    return '<div class="org">' + (kepala.length ? '<div class="lvl">' + kepala.map(function (k) { return nodeOrg(k, true); }).join('') + '</div>' : '') +
      '<div class="lvl">' + kasi.map(function (k) {
        var staf = d.pegawai.filter(function (s) { return s.unit && s.unit === k.unit; });
        return '<div class="cab">' + nodeOrg(k) + (staf.length ? '<div class="staf">' + staf.map(function (s) { return nodeOrg(s); }).join('') + '</div>' : '') + '</div>';
      }).join('') + '</div>' + (lain.length ? '<div class="cab" style="max-width:720px;width:100%"><div class="lbl-f">Staf</div><div class="staf">' + lain.map(function (s) { return nodeOrg(s); }).join('') + '</div></div>' : '') + '</div>';
  }

  // ------------------------------------------------------------------ BERITA, PENGUMUMAN, REGULASI
  function berita(args) {
    if (args[0]) {
      APP.innerHTML = '<div class="wrap" style="max-width:860px;padding:32px 24px 56px" id="isi">' + UI.sk.baris(10) + '</div>';
      App.swr('publik.berita', { id: args[0] }, { maxAge: 600000, onData: function (b) {
        document.title = b.judul + ' — Dishub Balikpapan';
        $('#isi').innerHTML = '<a href="#/berita" class="btn btn-ghost btn-sm">' + ikon('arrow_back') + 'Semua berita</a><div class="row small muted" style="margin:16px 0 8px">' + (b.kategori ? '<span class="badge b-navy">' + esc(b.kategori) + '</span>' : '') + fmt.tglP(b.tanggal) + '</div><h1>' + esc(b.judul) + '</h1>' +
          (b.gambar ? '<img src="' + esc(b.gambar) + '" alt="" style="border-radius:12px;margin:20px 0;width:100%" referrerpolicy="no-referrer">' : '<div style="height:20px"></div>') + '<div class="prose">' + esc(b.isi) + '</div>';
      } }).catch(function (e) { $('#isi').innerHTML = gagal(e); });
      return;
    }
    APP.innerHTML = pageH('Publikasi', 'Berita', 'Kegiatan dan informasi terbaru Bidang Sarana Transportasi.') + '<div class="wrap" style="padding-bottom:56px"><div class="inp-ico" style="max-width:420px;margin-bottom:20px">' + ikon('search') + '<input class="inp" id="qB" type="search" placeholder="Cari berita…"></div><div class="grid g3 berita" id="list">' + UI.sk.kartu(6) + '</div></div>';
    var semua = [];
    var tampil = function () { var q = $('#qB').value.toLowerCase(), l = semua.filter(function (b) { return !q || (b.judul + ' ' + b.ringkasan).toLowerCase().indexOf(q) > -1; }); $('#list').innerHTML = l.length ? l.map(function (b) { return kartuBerita(b, 'h2'); }).join('') : '<div class="kosong card" style="grid-column:1/-1">' + ikon('newspaper') + '<h4>Tidak ada berita</h4></div>'; };
    $('#qB').oninput = App.debounce(tampil, 150);
    App.swr('publik.berita', {}, { maxAge: 300000, onData: function (d) { semua = d; tampil(); } }).catch(function (e) { $('#list').innerHTML = gagal(e); });
  }

  function pengumuman() {
    APP.innerHTML = pageH('Informasi', 'Pengumuman') + '<div class="wrap" style="max-width:900px;padding-bottom:56px" id="list">' + UI.sk.baris(8) + '</div>';
    App.swr('publik.pengumuman', {}, { maxAge: 300000, onData: function (d) {
      $('#list').innerHTML = d.length ? d.map(function (p) {
        return '<details class="card" style="margin-bottom:10px"><summary class="card-b row" style="cursor:pointer;list-style:none"><span class="badge b-amber mono">' + fmt.tgl(p.tanggal) + '</span><b class="grow">' + esc(p.judul) + '</b>' + ikon('expand_more') + '</summary><div class="card-b prose" style="padding-top:0">' + esc(p.isi) + '</div></details>';
      }).join('') : '<div class="kosong card">' + ikon('campaign') + '<h4>Belum ada pengumuman</h4></div>';
    } }).catch(function (e) { $('#list').innerHTML = gagal(e); });
  }

  function regulasi() {
    APP.innerHTML = pageH('Dasar hukum', 'Regulasi', 'Peraturan yang menjadi dasar penyelenggaraan sarana transportasi Kota Balikpapan.') + '<div class="wrap" style="padding-bottom:56px"><div class="card"><div class="tbl-bar"><div class="inp-ico">' + ikon('search') + '<input class="inp" id="qR" type="search" placeholder="Cari judul, nomor, atau tahun…"></div></div><div id="list">' + UI.sk.baris(6) + '</div></div></div>';
    var semua = [];
    var tampil = function () {
      var q = $('#qR').value.toLowerCase(), l = semua.filter(function (r) { return !q || [r.judul, r.nomor, r.tahun, r.jenis].join(' ').toLowerCase().indexOf(q) > -1; });
      $('#list').innerHTML = l.length ? l.map(function (r) {
        return '<div class="row" style="padding:14px 16px;border-bottom:1px solid var(--line)"><span style="color:var(--bad);font-size:28px">' + ikon('picture_as_pdf') + '</span><div class="grow"><b>' + esc(r.judul) + '</b><div class="small muted">' + esc([r.jenis, r.nomor ? 'Nomor ' + r.nomor : '', r.tahun ? 'Tahun ' + r.tahun : ''].filter(String).join(' · ')) + '</div></div>' +
          (r.url ? '<a class="btn btn-outline btn-sm" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + ikon('download') + 'Unduh</a>' : '<span class="small muted">Berkas belum tersedia</span>') + '</div>';
      }).join('') : '<div class="kosong">' + ikon('search_off') + '<h4>' + (q ? 'Tidak ada regulasi yang cocok' : 'Belum ada regulasi') + '</h4></div>';
    };
    $('#qR').oninput = App.debounce(tampil, 150);
    App.swr('publik.regulasi', {}, { maxAge: 600000, onData: function (d) { semua = d; tampil(); } }).catch(function (e) { $('#list').innerHTML = gagal(e); });
  }

  // ------------------------------------------------------------------ PENGADUAN
  function pengaduan() {
    APP.innerHTML = pageH('Layanan', 'Form Pengaduan', 'Laporkan masalah pelayanan, fasilitas, atau kendaraan angkutan umum. Anda akan menerima kode tiket untuk melacak tindak lanjutnya.') +
      '<div class="wrap" style="max-width:760px;padding-bottom:56px" id="wadah"><form class="card card-b stack" id="fAdu" novalidate>' +
      '<div class="field"><label>Jenis laporan <span class="req">*</span></label><div class="seg"><label><input type="radio" name="jenis" value="Pengaduan umum" checked>Pengaduan umum</label><label><input type="radio" name="jenis" value="Laporan kendaraan angkutan">Laporan kendaraan angkutan</label></div></div>' +
      '<div class="field" id="fKat"><label>Kategori</label><select class="sel" name="kategori"><option>Layanan angkutan umum</option><option>Fasilitas halte</option><option>Tarif</option><option>Perilaku pengemudi</option><option>Lainnya</option></select></div>' +
      '<div class="field hide" id="fNopol"><label>Nomor polisi kendaraan <span class="req">*</span></label><input class="inp mono" name="nopol" maxlength="12" placeholder="KT 1234 AB"></div>' +
      '<div class="form-grid"><div class="field"><label>Nama <span class="req">*</span></label><input class="inp" name="nama" required maxlength="100" autocomplete="name"></div>' +
      '<div class="field"><label>Nomor HP <span class="req">*</span></label><input class="inp" name="hp" required inputmode="tel" maxlength="16" placeholder="08xxxxxxxxxx" autocomplete="tel"><div class="hint">Hanya dipakai petugas untuk menghubungi Anda.</div></div>' +
      '<div class="field"><label>Lokasi kejadian <span class="req">*</span></label><input class="inp" name="lokasi" required maxlength="200" placeholder="Nama jalan / patokan"></div>' +
      '<div class="field"><label>Waktu kejadian <span class="req">*</span></label><input class="inp" type="datetime-local" name="waktu" required></div></div>' +
      '<div class="field"><label>Deskripsi <span class="req">*</span></label><textarea class="ta" name="deskripsi" required maxlength="2000" rows="5" placeholder="Ceritakan kejadian secara singkat dan jelas."></textarea><div class="hint"><span id="hit">0</span>/2000</div></div>' +
      '<div style="position:absolute;left:-9999px" aria-hidden="true"><label>Situs web<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<button class="btn btn-amber btn-lg btn-block">' + ikon('send') + 'Kirim Pengaduan</button></form></div>';
    var f = $('#fAdu');
    f.addEventListener('change', function () { var k = f.jenis.value === 'Laporan kendaraan angkutan'; $('#fNopol').classList.toggle('hide', !k); $('#fKat').classList.toggle('hide', k); f.nopol.required = k; });
    f.deskripsi.oninput = function () { $('#hit').textContent = this.value.length; };
    f.onsubmit = function (e) {
      e.preventDefault();
      if (!UI.Form.wajib(f)) return;
      var d = UI.Form.data(f); d.waktu = String(d.waktu).replace('T', ' ');
      if (d.jenis !== 'Laporan kendaraan angkutan') delete d.nopol; else delete d.kategori;
      UI.Form.muat(f.querySelector('button.btn-amber'), App.api('publik.pengaduan', d)).then(function (r) {
        $('#wadah').innerHTML = '<div class="card card-b center stack-lg" style="padding:40px 24px"><div style="color:var(--ok);font-size:56px">' + ikon('check_circle', 'fill') + '</div><h2>Pengaduan terkirim</h2>' +
          '<div><div class="small muted">Kode tiket Anda</div><div class="mono" style="font-size:28px;font-weight:700;border:2px dashed var(--line-2);border-radius:12px;padding:14px;margin:8px auto;max-width:320px" id="kodeT">' + esc(r.kode) + '</div>' +
          '<button class="btn btn-outline btn-sm" id="salin">' + ikon('content_copy') + 'Salin</button></div><p class="muted">Simpan kode ini untuk melacak status pengaduan Anda.</p>' +
          '<div class="row" style="justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="#/cek?tab=tiket&kode=' + encodeURIComponent(r.kode) + '">' + ikon('search') + 'Lacak Status</a><a class="btn btn-outline" href="#/">Kembali ke Beranda</a></div></div>';
        $('#salin').onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(r.kode) : Promise.reject()).then(function () { App.toast('Kode disalin.', 'ok'); }, function () { App.toast('Salin manual: ' + r.kode); }); };
      }, function (er) { App.toast(er.message, 'bad'); });
    };
  }

  // ------------------------------------------------------------------ CEK STATUS
  function cek(args, q) {
    var tabs = [['kendaraan', 'Kendaraan Angkutan', 'directions_bus'], ['surat', 'Surat Tilang', 'gavel'], ['tiket', 'Tiket Pengaduan', 'confirmation_number']];
    var tab = q.get('tab') || 'kendaraan';
    APP.innerHTML = pageH('Layanan mandiri', 'Cek Status', 'Periksa status kendaraan angkutan umum, surat penindakan ETLE Dishub, atau tiket pengaduan Anda.') +
      '<div class="wrap" style="padding-bottom:56px;max-width:980px"><div class="card"><div class="tabs" id="tabCek" style="padding:0 12px"></div><div class="card-b" id="formCek"></div></div><div id="hasilCek" style="margin-top:16px"></div>' +
      '<div class="note" style="margin-top:16px">' + ikon('shield') + '<div>Pencarian dibatasi untuk melindungi data: maksimal 5 percobaan per nomor polisi setiap 15 menit. Data pribadi pelanggar tidak ditampilkan pada hasil surat penindakan.</div></div></div>';
    function gambarTab() {
      var list = tabs.filter(function (t) { return t[0] !== 'surat' || ETLE_ON; });
      if (!list.some(function (t) { return t[0] === tab; })) tab = 'kendaraan';
      $('#tabCek').innerHTML = list.map(function (t) { return '<a href="#/cek?tab=' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + ikon(t[2]) + t[1] + '</a>'; }).join('');
    }
    gambarTab();
    if (!BOOT) muatBoot(function () { gambarTab(); });
    var F = {
      kendaraan: '<form id="fCek" class="row top wrap-row"><div class="field grow"><label>Nomor polisi kendaraan</label><div class="inp-ico">' + ikon('directions_bus') + '<input class="inp mono" name="nopol" maxlength="12" placeholder="KT 1234 AB" required value="' + esc(q.get('nopol')) + '"></div></div><button class="btn btn-primary btn-lg" style="margin-top:24px">' + ikon('verified') + 'Periksa</button></form>',
      surat: '<form id="fCek" class="form-grid"><div class="field"><label>Nomor surat</label><input class="inp mono" name="no" required placeholder="1/ETL/DISHUB/XI/2026" value="' + esc(q.get('no')) + '"></div><div class="field"><label>Nomor polisi</label><input class="inp mono" name="nopol" maxlength="12" required placeholder="KT 1234 AB" value="' + esc(q.get('nopol')) + '"></div><div class="full"><button class="btn btn-primary btn-lg">' + ikon('verified') + 'Periksa Surat</button> <span class="small muted">Keduanya harus cocok.</span></div></form>',
      tiket: '<form id="fCek" class="row top wrap-row"><div class="field grow"><label>Kode tiket</label><div class="inp-ico">' + ikon('confirmation_number') + '<input class="inp mono" name="kode" required placeholder="TKT-XXXXXX" value="' + esc(q.get('kode')) + '"></div></div><button class="btn btn-primary btn-lg" style="margin-top:24px">' + ikon('search') + 'Lacak</button></form>'
    };
    $('#formCek').innerHTML = F[tab];
    var f = $('#fCek');
    f.onsubmit = function (e) {
      e.preventDefault(); if (!UI.Form.wajib(f)) return;
      var d = UI.Form.data(f), btn = f.querySelector('button'), hasil = $('#hasilCek');
      hasil.innerHTML = '<div class="card">' + UI.sk.baris(5) + '</div>';
      var p = tab === 'kendaraan' ? App.api('publik.cekKendaraan', { nopol: d.nopol }) : tab === 'surat' ? App.api('publik.cekSurat', { nomor: d.no, nopol: d.nopol }) : App.api('publik.cekTiket', { kode: d.kode });
      UI.Form.muat(btn, p).then(function (r) { hasil.innerHTML = tab === 'kendaraan' ? hasilKendaraan(r) : tab === 'surat' ? hasilSurat(r) : hasilTiket(r); hasil.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
        function (er) { hasil.innerHTML = '<div class="card card-b"><div class="note ' + (er.kode === 'RATE' ? 'warn' : '') + '">' + ikon(er.kode === 'RATE' ? 'timer' : 'search_off') + '<div><b>' + esc(er.message) + '</b>' + (er.kode === 'NOT_FOUND' ? '<div class="small muted">Periksa kembali penulisan lalu coba lagi.</div>' : '') + '</div></div></div>'; });
    };
    if ((tab === 'kendaraan' && q.get('nopol')) || (tab === 'tiket' && q.get('kode')) || (tab === 'surat' && q.get('no') && q.get('nopol'))) f.requestSubmit ? f.requestSubmit() : f.onsubmit(new Event('submit'));
    else if (tab === 'surat' && q.get('no')) f.nopol.focus();
  }
  function hasilKendaraan(r) {
    var hari = r.masaBerlaku ? Math.round((new Date(r.masaBerlaku + 'T00:00:00+08:00') - new Date(fmt.hariIni() + 'T00:00:00+08:00')) / 864e5) : null;
    return '<div class="card hasil-cek"><div class="card-b head">' + App.plat(r.nopol, true).replace('plate', 'plate xl') + '<div class="grow"><div class="small muted up">Kendaraan angkutan umum</div><b style="font-size:17px">' + esc(r.trayek || '-') + '</b></div>' + App.badge(r.status) + (r.diblokir ? ' ' + App.badge('DIBLOKIR') : '') + '</div>' +
      (r.diblokir ? '<div class="card-b" style="padding-top:0"><div class="note crit">' + ikon('lock') + '<div><b>Kendaraan ini sedang diblokir.</b> Kartu pengawasan tidak dapat diterbitkan atau diperpanjang sampai status blokir dicabut petugas.</div></div></div>' : '') +
      '<div class="card-b" style="padding-top:0"><dl class="dl"><div><dt>Pemilik</dt><dd>' + esc(r.pemilik || '-') + '</dd></div><div><dt>Perusahaan</dt><dd>' + esc(r.perusahaan || '-') + '</dd></div><div><dt>Trayek</dt><dd>' + esc(r.trayek || '-') + '</dd></div>' +
      '<div><dt>Masa berlaku kartu pengawasan</dt><dd>' + fmt.tglP(r.masaBerlaku) + (hari !== null ? '<div class="small" style="color:' + (hari < 0 ? 'var(--bad)' : 'var(--ok-tx)') + '">' + (hari < 0 ? 'Lewat ' + (-hari) + ' hari' : 'Berlaku ' + hari + ' hari lagi') + '</div>' : '') + '</dd></div></dl></div></div>';
  }
  function hasilSurat(r) {
    return '<div class="card hasil-cek"><div class="card-b head"><div class="grow"><div class="small muted up">Surat penindakan ETLE Dishub</div><b class="mono" style="font-size:18px">' + esc(r.nomorSurat) + '</b></div>' + App.badge(r.status) + '</div>' +
      '<div class="card-b" style="padding-top:0"><dl class="dl"><div><dt>Jenis pelanggaran</dt><dd>' + esc(r.jenis || r.pasal || '-') + (r.pasal && !/^(ps\.?|pasal)\s*\S/i.test(r.jenis || '') && String(r.jenis || '').toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(String(r.pasal).toLowerCase().replace(/[^a-z0-9]/g, '')) !== 0 ? '<div class="small muted mono">' + esc(r.pasal) + '</div>' : '') + '</dd></div><div><dt>Tanggal terbit</dt><dd>' + fmt.tglP(r.tanggal) + '</dd></div>' +
      '<div><dt>Lokasi (jalan)</dt><dd>' + esc(r.jalan || '-') + '</dd></div><div><dt>Sanksi yang dikenakan</dt><dd>' + (r.sanksi.length ? r.sanksi.map(function (s) { return '<span class="badge b-warn" style="margin:2px">' + esc(s) + '</span>'; }).join('') : '-') + '</dd></div></dl>' +
      '<div class="note" style="margin-top:12px">' + ikon('info') + '<div>' + esc(r.keterangan) + '<div class="small muted">Data pribadi tidak ditampilkan.</div></div></div></div></div>';
  }
  function hasilTiket(r) {
    var urut = ['Diterima', 'Diproses', 'Selesai'], idx = urut.indexOf(r.status);
    return '<div class="card"><div class="card-b row between wrap-row"><div><div class="small muted up">Tiket pengaduan</div><b class="mono" style="font-size:18px">' + esc(r.kode) + '</b><div class="small muted">' + esc(r.jenis || '') + '</div></div>' + App.badge(r.status) + '</div>' +
      '<div class="card-b" style="padding-top:0"><div class="tl">' + urut.map(function (s, i) { return '<div class="tl-i' + (i <= idx ? ' on' : '') + '"><span class="dot">' + ikon(i <= idx ? 'check' : 'radio_button_unchecked') + '</span><b>' + s + '</b><div class="small muted">' + (i === 0 ? fmt.tglJam(r.tanggalLapor) : (i === idx && r.tanggalUpdate ? fmt.tglJam(r.tanggalUpdate) : '')) + '</div></div>'; }).join('') + '</div>' +
      (r.tanggapan ? '<div class="card card-b" style="margin-top:16px;background:var(--bg)"><div class="lbl-f">' + ikon('support_agent') + ' Tanggapan petugas</div><div style="white-space:pre-line">' + esc(r.tanggapan) + '</div></div>' : '') + '</div></div>';
  }

  // ------------------------------------------------------------------ SURVEI
  function survei() {
    APP.innerHTML = pageH('Layanan', 'Survei Layanan', 'Beri nilai 1 sampai 5 untuk setiap unsur pelayanan. Penilaian Anda bersifat anonim.') + '<div class="wrap" style="max-width:760px;padding-bottom:56px" id="wadah"><div class="card">' + UI.sk.baris(8) + '</div></div>';
    App.swr('publik.survei', {}, { maxAge: 600000, onData: function (qs) {
      var nilai = {};
      $('#wadah').innerHTML = '<form class="card card-b stack" id="fSv">' + qs.map(function (x, i) {
        return '<div class="row between wrap-row" style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="grow"><b>' + (i + 1) + '. ' + esc(x.teks) + '</b></div><div class="bintang" data-q="' + esc(x.id) + '" role="radiogroup" aria-label="' + esc(x.teks) + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '" aria-label="' + n + ' bintang">' + ikon('star') + '</button>'; }).join('') + '</div></div>';
      }).join('') + '<div class="field"><label>Komentar atau saran (opsional)</label><textarea class="ta" name="komentar" maxlength="500" rows="3"></textarea></div>' +
        '<div style="position:absolute;left:-9999px" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div><button class="btn btn-primary btn-lg btn-block">' + ikon('send') + 'Kirim Penilaian</button></form>';
      $$('.bintang').forEach(function (g) { g.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; var n = +b.dataset.n; nilai[g.dataset.q] = n; $$('button', g).forEach(function (x) { x.classList.toggle('on', +x.dataset.n <= n); }); }; });
      $('#fSv').onsubmit = function (e) {
        e.preventDefault(); var f = this;
        if (Object.keys(nilai).length < qs.length) { App.toast('Beri nilai untuk semua pertanyaan.', 'warn'); return; }
        UI.Form.muat(f.querySelector('.btn-primary'), App.api('publik.surveiKirim', { nilai: nilai, komentar: f.komentar.value, website: f.website.value })).then(function () {
          $('#wadah').innerHTML = '<div class="card card-b center stack" style="padding:40px"><div style="font-size:56px;color:var(--amber)">' + ikon('volunteer_activism', 'fill') + '</div><h2>Terima kasih</h2><p class="muted">Penilaian Anda membantu kami memperbaiki layanan.</p><a class="btn btn-outline" href="#/statistik">Lihat hasil survei</a></div>';
        }, function (er) { App.toast(er.message, 'bad'); });
      };
    } }).catch(function (e) { $('#wadah').innerHTML = gagal(e); });
  }

  // ------------------------------------------------------------------ STATISTIK
  function statistik() {
    APP.innerHTML = pageH('Transparansi', 'Statistik Layanan', 'Ringkasan pengaduan, hasil survei, dan penindakan dalam bentuk agregat.') + '<div class="wrap stack-lg" style="padding-bottom:56px" id="st"><div class="grid g4">' + UI.sk.kartu(4) + '</div><div class="grid g2"><div class="card">' + UI.sk.baris(8) + '</div><div class="card">' + UI.sk.baris(8) + '</div></div></div>';
    App.swr('publik.statistik', {}, { maxAge: 300000, onData: function (d) {
      var p = d.pengaduan, s = d.survei, e = d.etle, bl = d.bulan.map(fmt.bulan);
      $('#st').innerHTML = '<div class="grid g4">' + [['Total pengaduan', p.total, 'forum'], ['Pengaduan selesai', p.perStatus.Selesai || 0, 'task_alt'], ['Indeks survei (1–5)', s.rata ? s.rata.toFixed(2) : '—', 'star'], ['Responden survei', s.responden, 'groups']].map(function (x) {
        return '<div class="card stat"><div class="lbl">' + x[0] + '<span class="ico">' + ikon(x[2]) + '</span></div><div class="val">' + (typeof x[1] === 'number' ? fmt.angka(x[1]) : x[1]) + '</div></div>';
      }).join('') + '</div>' +
        '<div class="grid g2"><div class="card"><div class="card-h"><h2 class="h3">Pengaduan per bulan</h2></div><div class="card-b" id="c1"></div></div><div class="card"><div class="card-h"><h2 class="h3">Status pengaduan</h2></div><div class="card-b" id="c2"></div><div class="card-b" style="padding-top:0" id="c3"></div></div></div>' +
        '<div class="grid g2"><div class="card"><div class="card-h"><h2 class="h3">Hasil survei per unsur</h2><span class="small muted">rata-rata 1–5</span></div><div class="card-b" id="c4"></div></div><div class="card"><div class="card-h"><h2 class="h3">Sebaran nilai survei</h2></div><div class="card-b" id="c5"></div></div></div>' +
        (e ? '<div class="grid g2"><div class="card"><div class="card-h"><h2 class="h3">Penindakan per bulan</h2><span class="small muted">surat terbit</span></div><div class="card-b" id="c6"></div></div><div class="card"><div class="card-h"><h2 class="h3">Penindakan per kecamatan ' + esc(e.tahun) + '</h2></div><div class="card-b" id="c7"></div></div></div>' : '') +
        '<p class="small muted">Sumber: data Sistem Digital Bidang Sarana Transportasi, diperbarui otomatis.</p>';
      UI.Chart.batang($('#c1'), { label: bl, seri: [{ nama: 'Pengaduan', data: d.bulan.map(function (b) { return p.perBulan[b] || 0; }) }] });
      UI.Chart.donat($('#c2'), { satuan: 'aduan', item: [{ l: 'Diterima', n: p.perStatus.Diterima || 0, warna: '#2563EB' }, { l: 'Diproses', n: p.perStatus.Diproses || 0, warna: '#F2A900' }, { l: 'Selesai', n: p.perStatus.Selesai || 0, warna: '#16A34A' }] });
      UI.Chart.batangH($('#c3'), { item: Object.keys(p.perJenis).map(function (k) { return { l: k, n: p.perJenis[k] }; }).sort(function (a, b) { return b.n - a.n; }) });
      UI.Chart.batangH($('#c4'), { item: s.perPertanyaan.map(function (x) { return { l: x.teks + ' (' + (x.rata || 0).toFixed(2) + ')', n: x.rata, warna: '#F2A900' }; }) });
      UI.Chart.batang($('#c5'), { label: ['1', '2', '3', '4', '5'], seri: [{ nama: 'Jumlah nilai', data: s.distribusi, warna: '#F2A900' }] });
      if (e) {
        UI.Chart.garis($('#c6'), { label: bl, seri: [{ nama: 'Surat', data: d.bulan.map(function (b) { return e.perBulan[b] || 0; }) }] });
        UI.Chart.batangH($('#c7'), { item: Object.keys(e.perKecamatan).map(function (k) { return { l: k, n: e.perKecamatan[k] }; }) });
      }
    } }).catch(function (er) { $('#st').innerHTML = gagal(er); });
  }

  // ------------------------------------------------------------------ MASUK (Google) & DARURAT
  function masuk(args, q) {
    var pesan = ''; try { pesan = sessionStorage.getItem('pesan_masuk') || ''; sessionStorage.removeItem('pesan_masuk'); } catch (e) {}
    var s = App.Sesi.get();
    APP.innerHTML = '<section class="sec alt" style="min-height:70vh"><div class="wrap" style="max-width:460px"><div class="card card-b stack-lg center" style="padding:32px">' +
      '<img src="icons/logo.svg" alt="" width="64" height="64" style="margin:0 auto"><div><h2>Masuk untuk Petugas dan Admin</h2><p class="muted" style="margin-top:6px">Gunakan akun Google yang sudah didaftarkan admin.</p></div>' +
      (pesan ? '<div class="note warn" style="text-align:left">' + ikon('info') + '<div>' + esc(pesan) + '</div></div>' : '') +
      (s ? '<div class="note ok" style="text-align:left">' + ikon('verified_user') + '<div>Anda sudah masuk sebagai <b>' + esc(s.me.email) + '</b> (' + esc(s.me.role) + ').</div></div><a class="btn btn-primary btn-block" href="' + App.ROOT + App.Sesi.ke(s.me.role) + '">Buka ruang kerja</a>' : '') +
      '<div id="gBtn" style="display:flex;justify-content:center;min-height:44px"><div class="muat" style="padding:0"></div></div><div id="gInfo"></div>' +
      (App.CFG.DEV_LOGIN ? '<form id="fDev" class="stack" style="text-align:left;border-top:1px dashed var(--line-2);padding-top:16px"><div class="field"><label>Masuk uji (khusus simulator lokal)</label><input class="inp" name="email" type="email" placeholder="email@gmail.com" required></div><button class="btn btn-outline btn-block">Masuk uji</button></form>' : '') +
      '<p class="small muted">Hanya email yang didaftarkan admin dapat masuk. Sesi berlaku 6 jam.</p></div></div></section>';
    function selesai(r) {
      App.Sesi.simpan(r); App.Simpan.hapus();
      var ke = q.get('ke');
      location.href = ke && ke.indexOf(App.ROOT) === 0 && ke.indexOf('#/masuk') === -1 ? ke : App.ROOT + App.Sesi.ke(r.me.role);
    }
    function login(cred) {
      $('#gInfo').innerHTML = '<div class="muat" style="padding:10px">Memeriksa akun…</div>';
      App.api('auth.google', { credential: cred }).then(selesai, function (e) {
        $('#gInfo').innerHTML = '<div class="note bad" style="text-align:left">' + ikon(e.kode === 'NOT_LISTED' ? 'person_off' : 'error') + '<div>' + esc(e.message) + '</div></div>';
      });
    }
    if ($('#fDev')) $('#fDev').onsubmit = function (e) { e.preventDefault(); login('TEST:' + this.email.value.trim().toLowerCase()); };
    App.warmUp('pub');
    App.swr('auth.config', {}, { maxAge: 3600000 }).then(function (c) {
      if (!c.googleClientId) { $('#gBtn').innerHTML = '<div class="note warn" style="text-align:left">' + ikon('settings') + '<div>Login Google belum dikonfigurasi. Superadmin: isi Client ID lewat editor Apps Script (terapkanIsian) atau akses darurat.</div></div>'; return; }
      var tampil = function () {
        try {
          google.accounts.id.initialize({ client_id: c.googleClientId, callback: function (r) { login(r.credential); }, auto_select: false, cancel_on_tap_outside: true, ux_mode: 'popup' });
          $('#gBtn').innerHTML = '';
          google.accounts.id.renderButton($('#gBtn'), { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', locale: 'id', width: 300 });
        } catch (e) { $('#gBtn').innerHTML = '<div class="note bad">' + ikon('error') + '<div>Tombol Google gagal dimuat.</div></div>'; }
      };
      if (window.google && google.accounts) tampil();
      else {
        var sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = tampil;
        sc.onerror = function () { $('#gBtn').innerHTML = '<div class="note bad" style="text-align:left">' + ikon('wifi_off') + '<div>Layanan Google tidak dapat dimuat. Periksa koneksi internet.</div></div>'; };
        document.head.appendChild(sc);
      }
    }, function (e) { $('#gBtn').innerHTML = gagal(e); });
  }

  function darurat() {
    APP.innerHTML = '<section class="sec alt" style="min-height:70vh"><div class="wrap" style="max-width:420px"><form class="card card-b stack" id="fDar"><h2>' + ikon('emergency') + ' Akses darurat</h2><p class="small muted">Khusus pemulihan bila login Google bermasalah. Semua percobaan tercatat. Terkunci 15 menit setelah 5 kali salah.</p>' +
      '<div class="field"><label>Nama pengguna</label><input class="inp" name="username" autocomplete="username" required></div><div class="field"><label>Kata sandi</label><input class="inp" type="password" name="password" autocomplete="current-password" required></div>' +
      '<button class="btn btn-primary btn-block">Masuk</button></form></div></section>';
    $('#fDar').onsubmit = function (e) {
      e.preventDefault(); var f = this;
      UI.Form.muat(f.querySelector('button'), App.api('auth.darurat', UI.Form.data(f))).then(function (r) { App.Sesi.simpan(r); location.href = App.ROOT + 'simau/#/sistem'; }, function (er) { App.toast(er.message, 'bad'); });
    };
  }

  // ------------------------------------------------------------------ ROUTER
  var R = { beranda: beranda, profil: profil, berita: berita, pengumuman: pengumuman, regulasi: regulasi, pengaduan: pengaduan, cek: cek, survei: survei, statistik: statistik, masuk: masuk, 'masuk-darurat': darurat };
  var JUDUL = { beranda: 'Layanan Sarana Transportasi', profil: 'Profil', berita: 'Berita', pengumuman: 'Pengumuman', regulasi: 'Regulasi', pengaduan: 'Form Pengaduan', cek: 'Cek Status', survei: 'Survei Layanan', statistik: 'Statistik', masuk: 'Masuk', 'masuk-darurat': 'Akses Darurat' };
  var GRUP = { pengaduan: 'layanan', cek: 'layanan', survei: 'layanan' };
  function jalan() {
    var h = (location.hash || '').replace(/^#\/?/, ''), parts = h.split('?'), seg = parts[0].split('/').filter(String);
    var nama = seg[0] || 'beranda', fn = R[nama] || beranda;
    if (!R[nama]) nama = 'beranda';
    $$('#nav [data-r]').forEach(function (a) { a.classList.toggle('on', a.dataset.r === nama || a.dataset.r === GRUP[nama]); });
    $('#nav').classList.remove('buka'); $('#burger').setAttribute('aria-expanded', 'false');
    document.title = JUDUL[nama] + ' — Dishub Kota Balikpapan';
    window.scrollTo(0, 0);
    fn(seg.slice(1).map(decodeURIComponent), new URLSearchParams(parts[1] || ''));
    document.documentElement.classList.remove('bukan-beranda');   // dipasang skrip kecil di <head> agar hero statis tidak berkedip di tautan langsung
  }
  $('#burger').onclick = function () { var b = $('#nav').classList.toggle('buka'); this.setAttribute('aria-expanded', b ? 'true' : 'false'); };
  // Pasang aplikasi: tombol di menu & footer (sembunyi bila sudah terpasang), kartu ajakan di beranda (HP)
  (function () {
    var tampak = !App.Pasang.terpasang();
    $$('[data-pasang-app]').forEach(function (b) { b.classList.toggle('hide', !tampak); b.onclick = function (e) { e.preventDefault(); $('#nav').classList.remove('buka'); App.Pasang.mulai(); }; });
    document.addEventListener('terpasang', function () { $$('[data-pasang-app]').forEach(function (b) { b.classList.add('hide'); }); });
  })();
  App.daftarSW('sw.js');
  $('#thn').textContent = new Date().getFullYear();
  $('#ver').textContent = App.VERSI;
  window.addEventListener('hashchange', jalan);
  // Formulir publik (pengaduan, cek, survei, masuk) sering digambar setelah data tiba: label dihubungkan tiap kali isi berubah.
  if (window.MutationObserver) { var tLbl = 0; new MutationObserver(function () { if (!tLbl) tLbl = setTimeout(function () { tLbl = 0; App.labelOtomatis(APP); }, 0); }).observe(APP, { childList: true, subtree: true }); }
  jalan();
  window.addEventListener('load', function () { setTimeout(function () { App.warmUp('pub'); }, 1500); }, { once: true });   // pemanasan server tidak berebut dengan tampilan pertama
  if (!BOOT_DIMINTA) muatBoot();   // ticker + footer untuk halaman selain beranda
})();
