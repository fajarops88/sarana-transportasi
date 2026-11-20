/**
 * konten.js — Panel Konten (Superadmin, Admin Konten): halaman profil, struktur, berita, pengumuman,
 * regulasi, kontak, logo (situs + kop surat), survei, dan pengaduan masyarakat. Superadmin juga: akun, sistem, migrasi.
 * Semua bacaan lewat swr (tampil instan dari simpanan lokal) + batch otomatis saat pertama dibuka.
 */
(function () {
  'use strict';
  var esc = App.esc, ikon = App.ikon, fmt = App.fmt, $ = App.$, $$ = App.$$;
  var me = App.Sesi.me() || {}, SA = ['Superadmin'];

  // ------------------------------------------------------------------ bantuan data
  function data(tabel, onData, fresh) { return App.swr('konten.data', { tabel: tabel }, { maxAge: 30000, fresh: fresh, onData: onData }); }
  function simpan(tabel, row) { return App.api('konten.simpan', { tabel: tabel, row: row }); }
  function hapus(tabel, id) { return App.api('konten.hapus', { tabel: tabel, id: id }); }
  function galat(e) { return '<div class="card-b"><div class="note bad">' + ikon('error') + '<div>' + esc(e.message || e) + '</div></div></div>'; }
  function unggah(file, jenis) {
    var p;
    if (jenis === 'pdf') { if (file.type !== 'application/pdf') return Promise.reject(new Error('Pilih berkas PDF.')); if (file.size > 8 * 1048576) return Promise.reject(new Error('PDF maksimal 8 MB.')); p = App.bacaBerkas(file); }
    else p = App.kompres(file, 1600, 450);
    return p.then(function (u) { return App.api('konten.upload', { nama: file.name, dataUrl: u }); }).then(function (r) { return r.url; });
  }
  function situs(hash) { return '<a class="btn btn-outline" href="' + App.ROOT + (hash || '') + '" target="_blank" rel="noopener">' + ikon('open_in_new') + 'Lihat di situs</a>'; }

  /**
   * crud(el, cfg) — tabel + formulir modal untuk satu tabel konten.
   * cfg: { tabel, kolom, fields, judul, tambah, kosong, sortAwal, dirAwal, lebar, sebelumSimpan(row) }
   */
  function crud(el, cfg) {
    var tbl = null, semua = [];
    function muat(fresh) {
      return data(cfg.tabel, function (d) {
        semua = d;
        if (!tbl) tbl = UI.Tabel(el, {
          cari: cfg.cari === undefined ? 'Cari…' : cfg.cari, perHal: cfg.perHal || 15, sortAwal: cfg.sortAwal, dirAwal: cfg.dirAwal,
          toolbar: '<button class="btn btn-primary" data-tambah>' + ikon('add') + esc(cfg.tambah || 'Tambah') + '</button>',
          kolom: cfg.kolom.concat([{ l: '', cls: 'aksi', sort: false, f: function () { return '<button class="btn btn-ghost btn-icon btn-sm" data-aksi="hapus" title="Hapus" style="color:var(--bad)">' + ikon('delete') + '</button>'; } }]),
          data: d, onRow: form, kosong: cfg.kosong,
          onAksi: function (a, r) { if (a === 'hapus') buang(r); }
        });
        else tbl.setData(d);
        var b = el.querySelector('[data-tambah]'); if (b) b.onclick = function () { form(null); };
        if (cfg.onData) cfg.onData(d);
      }, fresh).catch(function (e) { if (!tbl) el.innerHTML = galat(e); else App.toast(e.message, 'bad'); });
    }
    function form(r) {
      var baru = !r; r = r || {};
      UI.Modal.buka({
        judul: (baru ? 'Tambah ' : 'Ubah ') + cfg.judul, lebar: cfg.lebar,
        isi: '<form id="fCrud" novalidate>' + UI.Form.bangun(typeof cfg.fields === 'function' ? cfg.fields(r, semua) : cfg.fields, r) + '</form>',
        onBuka: function (p) { UI.Form.pasangUnggah($('#fCrud', p), unggah); if (cfg.onForm) cfg.onForm($('#fCrud', p), r); },
        tombol: [{ l: 'Batal' }, { l: 'Simpan', cls: 'btn-primary', ikon: 'save', aksi: function (b, p) {
          var f = $('#fCrud', p); if (!UI.Form.wajib(f)) return false;
          var row = UI.Form.ambil(f); if (!baru) row.ID = r.ID;
          if (cfg.sebelumSimpan) { var pesan = cfg.sebelumSimpan(row); if (pesan) { App.toast(pesan, 'warn'); return false; } }
          return simpan(cfg.tabel, row).then(function (x) {
            row.ID = x.id;
            // optimistis: tampilkan perubahan seketika, lalu segarkan dari server di latar
            semua = baru ? semua.concat([row]) : semua.map(function (o) { return o.ID === row.ID ? Object.assign({}, o, row) : o; });
            tbl.setData(semua); App.toast(baru ? 'Ditambahkan.' : 'Tersimpan.', 'ok'); muat(true);
          });
        } }]
      });
    }
    function buang(r) {
      UI.Modal.konfirm('Hapus <b>' + esc(r.JUDUL || r.NAMA || r.PERTANYAAN || r.ID) + '</b>?', { ok: 'Hapus', bahaya: true }).then(function (ok) {
        if (!ok) return;
        semua = semua.filter(function (o) { return o.ID !== r.ID; }); tbl.setData(semua);
        hapus(cfg.tabel, r.ID).then(function () { App.toast('Dihapus.', 'ok'); muat(true); }, function (e) { App.toast(e.message, 'bad'); muat(true); });
      });
    }
    el.innerHTML = UI.sk.baris(8);
    muat();
    return { muat: muat, form: form };
  }

  // ================================================================== RINGKASAN
  function ringkasan(el) {
    var hidup = Shell.hidup();
    setTimeout(function () { App.Pasang.kartu($('#pasangK'), { kunci: 'konten', hpSaja: true, teks: 'Kelola isi website langsung dari layar utama HP.' }); }, 0);
    el.innerHTML = Shell.judul(el, { eyebrow: 'Panel Konten', h: 'Ringkasan', p: 'Kelola isi situs publik Bidang Sarana Transportasi. Perubahan tampil di situs paling lambat beberapa detik setelah disimpan.', aksi: situs() }) +
      '<div id="pasangK"></div><div class="grid g4" id="kpi">' + UI.sk.kartu(4) + '</div>' +
      '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>' + ikon('forum') + 'Pengaduan terbaru</h3><a href="#/pengaduan" class="btn btn-ghost btn-sm">Semua' + ikon('arrow_forward') + '</a></div><div id="aduBaru">' + UI.sk.baris(5) + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ikon('bolt') + 'Pintasan</h3></div><div class="card-b grid g2" style="gap:10px">' +
      [['#/berita?baru=1', 'post_add', 'Tulis berita'], ['#/pengumuman?baru=1', 'campaign', 'Buat pengumuman'], ['#/teks', 'article', 'Ubah sambutan'], ['#/struktur', 'account_tree', 'Perbarui pejabat'], ['#/regulasi?baru=1', 'upload_file', 'Unggah regulasi'], ['#/kontak', 'contact_phone', 'Ubah kontak']].map(function (x) {
        return '<a class="chk" href="' + x[0] + '" style="text-decoration:none;color:inherit;align-items:center">' + ikon(x[1]) + '<b class="small">' + x[2] + '</b></a>';
      }).join('') + '</div></div></div>';
    var st = {};
    function kpi() {
      if (!st.b || !st.p || !st.a || !st.s || !hidup()) return;
      var tayang = st.b.filter(function (x) { return x.STATUS === 'Tayang'; }).length;
      $('#kpi').innerHTML = [['Berita tayang', tayang, 'newspaper', (st.b.length - tayang) + ' draf'], ['Pengumuman aktif', st.p.filter(function (x) { return /^ya$/i.test(x.AKTIF); }).length, 'campaign', 'dari ' + st.p.length + ' pengumuman'],
        ['Pengaduan menunggu', st.a.filter(function (x) { return x.status === 'Diterima'; }).length, 'mark_email_unread', st.a.filter(function (x) { return x.status === 'Diproses'; }).length + ' sedang diproses'],
        ['Indeks survei', st.s.rata ? st.s.rata.toFixed(2) : '—', 'star', st.s.responden + ' responden']].map(function (x) {
        return '<div class="card stat"><div class="lbl">' + x[0] + '<span class="ico">' + ikon(x[2]) + '</span></div><div class="val">' + (typeof x[1] === 'number' ? fmt.angka(x[1]) : x[1]) + '</div><div class="ft">' + esc(x[3]) + '</div></div>';
      }).join('');
    }
    data('WEB_Berita', function (d) { st.b = d; kpi(); }).catch(function () { st.b = st.b || []; kpi(); });
    data('WEB_Pengumuman', function (d) { st.p = d; kpi(); }).catch(function () { st.p = st.p || []; kpi(); });
    App.swr('konten.survei', {}, { maxAge: 60000, onData: function (d) { st.s = d; kpi(); } }).catch(function () { st.s = st.s || { rata: 0, responden: 0 }; kpi(); });
    App.swr('aduan.list', {}, { maxAge: 20000, onData: function (d) {
      st.a = d; kpi(); Shell.badgeMenu('aduan', d.filter(function (x) { return x.status === 'Diterima'; }).length);
      var el2 = $('#aduBaru'); if (!el2 || !hidup()) return;
      el2.innerHTML = d.length ? d.slice(0, 5).map(function (r) {
        return '<a href="#/pengaduan" class="row" style="padding:12px 18px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none"><div class="grow"><b class="mono small">' + esc(r.kode) + '</b> <span class="small muted">' + esc(r.kategori || r.jenis) + '</span><div class="small" style="margin-top:2px">' + esc(String(r.deskripsi || '').slice(0, 80)) + '</div></div><div style="text-align:right">' + App.badge(r.status) + '<div class="tiny muted">' + fmt.relatif(r.tanggal) + '</div></div></a>';
      }).join('') : '<div class="kosong">' + ikon('forum') + '<h4>Belum ada pengaduan</h4></div>';
    } }).catch(function (e) { st.a = st.a || []; kpi(); if ($('#aduBaru')) $('#aduBaru').innerHTML = galat(e); });
  }

  // ================================================================== TEKS: PROFIL, SEJARAH, SAMBUTAN
  function teks(el) {
    var JENIS = [['Sambutan', 'Sambutan pejabat', '200 karakter pertama tampil di kartu Sambutan pada Beranda.'], ['Profil', 'Profil bidang', 'Tampil di halaman Profil → Sejarah (bagian atas).'], ['Sejarah', 'Sejarah', 'Tampil di halaman Profil → Sejarah.']];
    el.innerHTML = Shell.judul(el, { eyebrow: 'Halaman profil', h: 'Profil, Sejarah & Sambutan', p: 'Teks panjang untuk halaman Profil dan kartu Sambutan di Beranda.', aksi: situs('#/profil/sejarah') }) +
      '<div class="stack-lg" id="wadah">' + JENIS.map(function () { return '<div class="card">' + UI.sk.baris(5) + '</div>'; }).join('') + '</div>';
    var hidup = Shell.hidup();
    data('WEB_Konten_Teks', function (d) {
      if (!hidup()) return;
      var by = {}; d.forEach(function (o) { by[o.JENIS] = o; });
      $('#wadah').innerHTML = JENIS.map(function (j) {
        var o = by[j[0]] || {};
        return '<form class="card" data-jenis="' + j[0] + '" data-id="' + esc(o.ID || '') + '"><div class="card-h"><h3>' + esc(j[1]) + '</h3><span class="small muted">' + (o.DIUBAH ? 'Diubah ' + fmt.tglJam(o.DIUBAH) : 'Belum diisi') + '</span></div>' +
          '<div class="card-b stack"><div class="field"><label>Judul</label><input class="inp" name="JUDUL" maxlength="200" value="' + esc(o.JUDUL || j[1]) + '"></div>' +
          '<div class="field"><label>Isi</label><textarea class="ta" name="ISI" rows="' + (j[0] === 'Sambutan' ? 5 : 9) + '">' + esc(o.ISI || '') + '</textarea><div class="hint">' + esc(j[2]) + ' <span data-hit></span></div></div>' +
          '<div class="row" style="justify-content:flex-end"><button class="btn btn-primary">' + ikon('save') + 'Simpan ' + esc(j[1].toLowerCase()) + '</button></div></div></form>';
      }).join('');
      $$('#wadah form').forEach(function (f) {
        var hit = $('[data-hit]', f), ta = f.ISI, upd = function () { hit.textContent = '(' + ta.value.length + ' karakter' + (f.dataset.jenis === 'Sambutan' && ta.value.length > 200 ? ', sisanya terlihat di halaman profil' : '') + ')'; };
        ta.oninput = upd; upd();
        f.onsubmit = function (e) {
          e.preventDefault();
          var row = { JENIS: f.dataset.jenis, JUDUL: f.JUDUL.value, ISI: ta.value }; if (f.dataset.id) row.ID = f.dataset.id;
          UI.Form.muat(f.querySelector('button.btn-primary'), simpan('WEB_Konten_Teks', row)).then(function (x) { f.dataset.id = x.id; App.toast('Tersimpan.', 'ok'); data('WEB_Konten_Teks', null, true); }, function (er) { App.toast(er.message, 'bad'); });
        };
      });
    }).catch(function (e) { $('#wadah').innerHTML = '<div class="card">' + galat(e) + '</div>'; });
  }

  // ================================================================== POIN: VISI, MISI, TUGAS, FUNGSI (split + pratinjau langsung)
  function poin(el, args, q) {
    var J = ['Visi', 'Misi', 'Tugas', 'Fungsi'], jenis = J.indexOf(q.get('j')) > -1 ? q.get('j') : 'Visi', semua = [];
    el.innerHTML = Shell.judul(el, { eyebrow: 'Halaman profil', h: 'Visi, Misi, Tugas & Fungsi', p: 'Ubah butir di kiri; pratinjau di kanan mengikuti saat Anda mengetik. Urutan menentukan nomor tampil.', aksi: situs('#/profil/visi-misi') }) +
      '<div class="tabs" style="margin-bottom:16px">' + J.map(function (j) { return '<a href="#/poin?j=' + j + '" class="' + (j === jenis ? 'on' : '') + '">' + j + '</a>'; }).join('') + '</div>' +
      '<div class="grid g2" style="align-items:start"><div class="card"><div class="card-h"><h3>Butir ' + jenis + '</h3><span class="small muted" id="nPoin"></span></div><div class="card-b stack" id="daftar">' + UI.sk.baris(4) + '</div>' +
      '<div class="card-b" style="border-top:1px solid var(--line)"><form id="fBaru" class="stack"><div class="field"><label>Tambah butir ' + jenis.toLowerCase() + '</label><textarea class="ta" name="ISI" rows="2" required maxlength="1000"></textarea></div><button class="btn btn-outline">' + ikon('add') + 'Tambah butir</button></form></div></div>' +
      '<div class="card" style="position:sticky;top:84px"><div class="card-h"><h3>' + ikon('visibility') + 'Pratinjau situs</h3></div><div class="card-b" id="prev"></div></div></div>';
    function ini() { return semua.filter(function (o) { return o.JENIS === jenis; }).sort(function (a, b) { return (Number(a.NO) || 0) - (Number(b.NO) || 0); }); }
    function pratinjau() {
      var isi = $$('#daftar textarea').map(function (t) { return t.value; }).filter(String);
      $('#prev').innerHTML = !isi.length ? '<div class="kosong small">Belum ada butir.</div>' : jenis === 'Visi' ? isi.map(function (v) { return '<div class="visi">' + esc(v) + '</div>'; }).join('<div style="height:10px"></div>') : '<div class="eyebrow" style="margin-bottom:6px">' + jenis + '</div><ol class="misi">' + isi.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol>';
    }
    function gambar() {
      var l = ini(); $('#nPoin').textContent = l.length + ' butir';
      $('#daftar').innerHTML = l.length ? l.map(function (o, i) {
        return '<div class="row top" data-id="' + esc(o.ID) + '"><span class="badge b-navy mono" style="margin-top:10px">' + (i + 1) + '</span><textarea class="ta grow" rows="2" maxlength="1000">' + esc(o.ISI) + '</textarea>' +
          '<div class="stack" style="gap:2px"><button class="btn btn-ghost btn-icon btn-sm" data-a="naik" title="Naikkan"' + (i === 0 ? ' disabled' : '') + '>' + ikon('arrow_upward') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-a="turun" title="Turunkan"' + (i === l.length - 1 ? ' disabled' : '') + '>' + ikon('arrow_downward') + '</button></div>' +
          '<div class="stack" style="gap:2px"><button class="btn btn-ghost btn-icon btn-sm" data-a="simpan" title="Simpan">' + ikon('save') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-a="hapus" title="Hapus" style="color:var(--bad)">' + ikon('delete') + '</button></div></div>';
      }).join('') : '<div class="kosong small">' + ikon('format_list_numbered') + '<div>Belum ada butir ' + jenis.toLowerCase() + '.</div></div>';
      pratinjau();
    }
    $('#daftar').addEventListener('input', pratinjau);
    $('#daftar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var baris = b.closest('[data-id]'), id = baris.dataset.id, l = ini(), i = l.map(function (o) { return o.ID; }).indexOf(id), a = b.dataset.a;
      if (a === 'simpan') UI.Form.muat(b, simpan('WEB_Konten_Poin', { ID: id, JENIS: jenis, NO: l[i].NO, ISI: $('textarea', baris).value })).then(function () { l[i].ISI = $('textarea', baris).value; App.toast('Butir tersimpan.', 'ok'); muat(true); }, function (er) { App.toast(er.message, 'bad'); });
      if (a === 'hapus') UI.Modal.konfirm('Hapus butir ini?', { ok: 'Hapus', bahaya: true }).then(function (ok) { if (ok) { semua = semua.filter(function (o) { return o.ID !== id; }); gambar(); hapus('WEB_Konten_Poin', id).then(function () { muat(true); }, function (er) { App.toast(er.message, 'bad'); muat(true); }); } });
      if (a === 'naik' || a === 'turun') {
        var j2 = a === 'naik' ? i - 1 : i + 1, x = l[i], y = l[j2];
        // nomor urut dibuat rapat 1..n lalu ditukar; tampilan diperbarui seketika
        l.forEach(function (o, k) { o.NO = String(k + 1); });
        var t = x.NO; x.NO = y.NO; y.NO = t; gambar();
        Promise.all([simpan('WEB_Konten_Poin', { ID: x.ID, JENIS: jenis, NO: x.NO, ISI: x.ISI }), simpan('WEB_Konten_Poin', { ID: y.ID, JENIS: jenis, NO: y.NO, ISI: y.ISI })])
          .then(function () { muat(true); }, function (er) { App.toast(er.message, 'bad'); muat(true); });
      }
    });
    $('#fBaru').onsubmit = function (e) {
      e.preventDefault(); var f = this; if (!UI.Form.wajib(f)) return;
      UI.Form.muat(f.querySelector('button'), simpan('WEB_Konten_Poin', { JENIS: jenis, ISI: f.ISI.value })).then(function (x) {
        semua.push({ ID: x.id, JENIS: jenis, NO: String(ini().length + 1), ISI: f.ISI.value }); f.reset(); gambar(); App.toast('Butir ditambahkan.', 'ok'); muat(true);
      }, function (er) { App.toast(er.message, 'bad'); });
    };
    var hidup = Shell.hidup();
    function muat(fresh) { return data('WEB_Konten_Poin', function (d) { semua = d; if (hidup()) gambar(); }, fresh).catch(function (e) { $('#daftar').innerHTML = galat(e); }); }
    muat();
  }

  // ================================================================== STRUKTUR: PEJABAT & PEGAWAI
  function struktur(el) {
    el.innerHTML = Shell.judul(el, { eyebrow: 'Halaman profil', h: 'Struktur Organisasi', p: 'Pejabat level 1 tampil di puncak bagan; pejabat level 2 sebagai cabang. Pegawai dikelompokkan ke cabang menurut kolom Unit yang sama persis.', aksi: situs('#/profil/struktur') }) +
      '<div class="stack-lg"><div><h3 style="margin-bottom:10px">Pejabat</h3><div class="card" id="tPj"></div></div><div><h3 style="margin-bottom:10px">Pegawai / staf</h3><div class="card" id="tPg"></div></div></div>' +
      '<datalist id="dlUnit"></datalist>';
    var foto = function (r) { return r.FOTO_URL ? '<img src="' + esc(r.FOTO_URL) + '" alt="" referrerpolicy="no-referrer" style="width:36px;height:36px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px">' : '<span class="avatar" style="width:36px;height:36px;display:inline-grid;margin-right:8px;vertical-align:middle">' + ikon('person') + '</span>'; };
    var unitList = [];
    crud($('#tPj'), {
      tabel: 'WEB_Pejabat', judul: 'pejabat', tambah: 'Tambah pejabat', cari: 'Cari nama, jabatan, unit…', sortAwal: 'URUTAN', perHal: 20,
      kolom: [{ k: 'NAMA', l: 'Nama', f: function (r) { return foto(r) + '<b>' + esc(r.NAMA) + '</b>' + (/^ya$/i.test(r.TAMPIL_BERANDA) ? ' <span class="badge b-amber">Beranda</span>' : ''); } },
        { k: 'JABATAN', l: 'Jabatan' }, { k: 'UNIT', l: 'Unit' }, { k: 'LEVEL', l: 'Level', f: function (r) { return r.LEVEL === '1' ? 'Kepala bidang' : 'Kepala seksi'; } }, { k: 'URUTAN', l: 'Urut', cls: 'right', nilaiUrut: function (r) { return Number(r.URUTAN) || 999; } }],
      fields: [{ k: 'NAMA', l: 'Nama lengkap dan gelar', wajib: true, maks: 120 }, { k: 'NIP', l: 'NIP', mono: true, maks: 30 }, { k: 'JABATAN', l: 'Jabatan', wajib: true, full: true, maks: 200 },
        { k: 'UNIT', l: 'Unit / seksi', full: true, atr: ' list="dlUnit"', hint: 'Pegawai dengan Unit yang sama akan tampil di bawah pejabat ini.' },
        { k: 'LEVEL', l: 'Level di bagan', t: 'select', opsi: [{ v: '1', l: '1 — Kepala bidang (puncak)' }, { v: '2', l: '2 — Kepala seksi (cabang)' }], awal: '2' }, { k: 'URUTAN', l: 'Urutan', t: 'number', min: 1, awal: '' },
        { k: 'TAMPIL_BERANDA', l: 'Tampilkan foto, nama, dan sambutan di Beranda (pilih satu orang)', t: 'switch', full: true }, { k: 'FOTO_URL', l: 'Foto', t: 'berkas', hint: 'Foto dikompres otomatis di perangkat sebelum diunggah.' }],
      onData: function (d) { unitList = d.map(function (x) { return x.UNIT; }).filter(String); $('#dlUnit').innerHTML = unitList.map(function (u) { return '<option value="' + esc(u) + '">'; }).join(''); }
    });
    crud($('#tPg'), {
      tabel: 'WEB_Pegawai', judul: 'pegawai', tambah: 'Tambah pegawai', cari: 'Cari nama, jabatan, unit…', sortAwal: 'URUTAN', perHal: 20,
      kolom: [{ k: 'NAMA', l: 'Nama', f: function (r) { return foto(r) + '<b>' + esc(r.NAMA) + '</b>'; } }, { k: 'JABATAN', l: 'Jabatan' },
        { k: 'UNIT', l: 'Unit', f: function (r) { return esc(r.UNIT || '') + (r.UNIT && unitList.indexOf(r.UNIT) === -1 ? ' <span class="badge b-warn" title="Tidak ada pejabat dengan unit ini; tampil di kelompok Staf">tanpa cabang</span>' : ''); } },
        { k: 'URUTAN', l: 'Urut', cls: 'right', nilaiUrut: function (r) { return Number(r.URUTAN) || 999; } }],
      fields: [{ k: 'NAMA', l: 'Nama', wajib: true, maks: 120 }, { k: 'JABATAN', l: 'Jabatan', maks: 200 }, { k: 'UNIT', l: 'Unit / seksi', atr: ' list="dlUnit"' }, { k: 'URUTAN', l: 'Urutan', t: 'number', min: 1 }, { k: 'FOTO_URL', l: 'Foto', t: 'berkas' }]
    });
  }

  // ================================================================== KONTAK
  function kontak(el) {
    var F = [{ k: 'kontak_alamat', l: 'Alamat kantor', t: 'textarea', rows: 2, maks: 500 }, { k: 'kontak_telepon', l: 'Telepon', maks: 40 }, { k: 'kontak_whatsapp', l: 'WhatsApp', ph: '08xxxxxxxxxx', hint: 'Dipakai untuk tombol WhatsApp di situs.' },
      { k: 'kontak_email', l: 'Email', t: 'email' }, { k: 'kontak_jam', l: 'Jam layanan', ph: 'Senin–Jumat, 08.00–16.00 WITA' }, { k: 'kontak_peta', l: 'Tautan peta (Google Maps)', ph: 'https://maps.app.goo.gl/…', full: true }];
    el.innerHTML = Shell.judul(el, { eyebrow: 'Halaman profil', h: 'Kontak', p: 'Tampil di halaman Profil → Kontak dan di kaki semua halaman situs.', aksi: situs('#/profil/kontak') }) +
      '<form class="card card-b" id="fK" style="max-width:860px">' + UI.sk.baris(6) + '</form>';
    var hidup = Shell.hidup();
    data('kontak', function (d) {
      var f = $('#fK'); if (!f || !hidup()) return;
      f.innerHTML = UI.Form.bangun(F, d) + '<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-primary">' + ikon('save') + 'Simpan kontak</button></div>';
      f.onsubmit = function (e) { e.preventDefault(); UI.Form.muat(f.querySelector('button'), App.api('konten.kontak', { kontak: UI.Form.ambil(f) })).then(function (r) { App.toast(r.diubah.length ? 'Kontak tersimpan.' : 'Tidak ada perubahan.', 'ok'); data('kontak', null, true); }, function (er) { App.toast(er.message, 'bad'); }); };
    }).catch(function (e) { $('#fK').innerHTML = galat(e); });
  }

  // ================================================================== LOGO (header situs/panel, favicon, kop surat)
  function logo(el) {
    var hidup = Shell.hidup(), siapSimpan = { kiri: null, kanan: null };
    var BAWAAN = App.ROOT + 'icons/logo.svg';
    function kartu(pos, judul, ket) {
      return '<div class="card card-b stack" data-pos="' + pos + '"><div><h3 style="margin:0">' + judul + '</h3><div class="small muted" style="margin-top:4px">' + ket + '</div></div>' +
        '<div style="height:150px;display:grid;place-items:center;border:1px solid var(--line);border-radius:10px;background:repeating-conic-gradient(#EEF2F7 0% 25%, #fff 0% 50%) 50%/16px 16px">' +
        '<img data-prev data-logo-tetap alt="" style="max-height:126px;max-width:90%;object-fit:contain"><span class="small muted hide" data-kosong>Tidak ada logo</span></div>' +
        '<div class="small muted" data-info></div>' +
        '<div class="row wrap-row"><label class="btn btn-outline" style="cursor:pointer">' + ikon('upload') + 'Pilih gambar<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden data-file></label>' +
        '<button type="button" class="btn btn-primary" data-simpan disabled>' + ikon('save') + 'Simpan</button>' +
        '<button type="button" class="btn btn-ghost" data-batal disabled>Batal</button>' +
        '<button type="button" class="btn btn-ghost" data-hapus style="color:var(--bad);margin-left:auto">' + ikon('delete') + 'Hapus</button></div></div>';
    }
    el.innerHTML = Shell.judul(el, { eyebrow: 'Identitas', h: 'Logo', p: 'Dipakai di header situs dan panel, ikon tab browser, serta kop Kartu Pengawasan, laporan, dan Surat Penindakan ETLE. Berlaku untuk semua pengguna tanpa mengubah berkas frontend.', aksi: situs('') }) +
      '<div class="grid g2" style="gap:16px;align-items:start">' +
      kartu('kiri', 'Logo utama', 'Kiri kop surat, header situs dan panel, ikon tab browser. Biasanya lambang Pemerintah Kota Balikpapan.') +
      kartu('kanan', 'Logo kanan kop (opsional)', 'Sisi kanan kop surat, misalnya logo Dinas Perhubungan. Bila kosong, sisi kanan kop dibiarkan kosong.') + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h3>' + ikon('description') + 'Pratinjau kop</h3><span class="tiny muted">Teks kop diatur di ETLE → Pengaturan</span></div><div class="card-b"><div class="kertas a4" style="box-shadow:none;margin:0;max-width:100%;min-height:0;padding:16px" id="pratKop"></div></div></div>' +
      '<div class="note" style="margin-top:16px">' + ikon('info') + '<div class="small">Paling baik PNG berlatar transparan; JPG, WebP, dan SVG juga diterima. Gambar diperkecil di perangkat ini (sisi terpanjang 400 px) lalu disimpan sebagai PNG. ' +
      'Perangkat lain memakai logo baru begitu membuka halaman berikutnya. Ikon aplikasi yang sudah dipasang di layar utama HP tidak ikut berubah karena berasal dari berkas <code>icons/</code>.</div></div>';

    function sekarang(pos) { return pos === 'kiri' ? App.Logo.kiri() : App.Logo.kanan(); }
    function gambar() {
      ['kiri', 'kanan'].forEach(function (pos) {
        var c = $('[data-pos="' + pos + '"]', el); if (!c) return;
        var baru = siapSimpan[pos], ada = sekarang(pos), src = baru ? baru.url : ada || (pos === 'kiri' ? BAWAAN : '');
        var img = $('[data-prev]', c);
        img.classList.toggle('hide', !src); $('[data-kosong]', c).classList.toggle('hide', !!src);
        if (src) { img.setAttribute('src', src);  }   // pratinjau tidak ikut diganti otomatis
        $('[data-info]', c).innerHTML = baru ? '<b style="color:var(--ok-tx)">Siap disimpan</b> · ' + baru.w + '×' + baru.h + ' px · ' + baru.kb + ' KB'
          : ada ? 'Logo unggahan sedang dipakai.' : pos === 'kiri' ? 'Masih logo bawaan (sementara).' : 'Belum ada logo kanan.';
        $('[data-simpan]', c).disabled = !baru; $('[data-batal]', c).disabled = !baru; $('[data-hapus]', c).disabled = !ada;
      });
      kop();
    }
    function kop() {
      var w = $('#pratKop', el); if (!w) return;
      var L = siapSimpan.kiri ? siapSimpan.kiri.url : App.Logo.kiri() || BAWAAN, R = siapSimpan.kanan ? siapSimpan.kanan.url : App.Logo.kanan();
      var k = KOP || {};
      w.innerHTML = '<div class="kop" style="margin:0"><img src="' + esc(L) + '" alt="" data-logo-tetap style="object-fit:contain"><div class="t"><div>PEMERINTAH KOTA BALIKPAPAN</div><b>' + esc(String(k.dinas || 'DINAS PERHUBUNGAN KOTA BALIKPAPAN').toUpperCase()) + '</b><div>' + esc(String(k.bidang || 'BIDANG SARANA TRANSPORTASI').toUpperCase()) + '</div>' +
        '<small>' + esc(k.alamat || '') + '</small></div>' + (R ? '<img src="' + esc(R) + '" alt="" data-logo-tetap style="object-fit:contain">' : '<img src="' + esc(L) + '" alt="" data-logo-tetap style="visibility:hidden">') + '</div>';
    }
    function olah(file) {
      return new Promise(function (res, rej) {
        if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return rej(new Error('Pilih gambar PNG, JPG, WebP, atau SVG.'));
        if (file.size > 5 * 1048576) return rej(new Error('Gambar maksimal 5 MB.'));
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () {
          var w = img.naturalWidth || 400, h = img.naturalHeight || 400;
          var s = file.type === 'image/svg+xml' ? 400 / Math.max(w, h) : Math.min(1, 400 / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s)), cv = document.createElement('canvas');
          cv.width = cw; cv.height = ch;
          var g = cv.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, cw, ch);
          URL.revokeObjectURL(url);
          var d = cv.toDataURL('image/png');
          if (d.length > 400000) return rej(new Error('Hasil gambar masih terlalu besar (' + Math.round(d.length * 0.75 / 1024) + ' KB). Pakai gambar yang lebih sederhana.'));
          res({ url: d, w: cw, h: ch, kb: Math.round(d.length * 0.75 / 1024), jpg: file.type === 'image/jpeg' });
        };
        img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Gambar tidak dapat dibaca.')); };
        img.src = url;
      });
    }
    function setelah(pos, r, url) {
      var d = App.Logo.data(), o = { ver: r.ver, kiri: d.kiri || '', kanan: d.kanan || '' };
      o[pos] = url;
      App.Logo.simpan(r.ver ? o : null);
      siapSimpan[pos] = null; gambar();
    }
    $$('[data-pos]', el).forEach(function (c) {
      var pos = c.getAttribute('data-pos');
      $('[data-file]', c).onchange = function () {
        var f = this.files[0]; this.value = ''; if (!f) return;
        olah(f).then(function (h) {
          siapSimpan[pos] = h; gambar();
          if (h.jpg) App.toast('JPG tidak punya latar transparan; kotak putih di sekitar logo akan ikut tampil.', 'warn');
        }, function (e) { App.toast(e.message, 'bad'); });
      };
      $('[data-batal]', c).onclick = function () { siapSimpan[pos] = null; gambar(); };
      $('[data-simpan]', c).onclick = function () {
        var h = siapSimpan[pos]; if (!h) return;
        UI.Form.muat(this, App.api('konten.logo.simpan', { posisi: pos, dataUrl: h.url })).then(function (r) {
          setelah(pos, r, h.url); App.toast('Logo ' + (pos === 'kiri' ? 'utama' : 'kanan') + ' tersimpan dan langsung dipakai.', 'ok');
        }, function (e) { App.toast(e.message, 'bad'); });
      };
      $('[data-hapus]', c).onclick = function () {
        var b = this;
        UI.Modal.konfirm(pos === 'kiri' ? 'Hapus logo utama? Situs dan kop kembali memakai logo bawaan.' : 'Hapus logo kanan kop?', { ok: 'Hapus', bahaya: true }).then(function (ok) {
          if (!ok) return;
          UI.Form.muat(b, App.api('konten.logo.simpan', { posisi: pos, hapus: true })).then(function (r) { setelah(pos, r, ''); App.toast('Logo dihapus.', 'ok'); }, function (e) { App.toast(e.message, 'bad'); });
        });
      };
    });
    var KOP = null;
    App.swr('auth.config', {}, { maxAge: 3600000, onData: function (c) { if (!hidup()) return; KOP = { dinas: c.namaDinas, bidang: c.namaBidang, alamat: c.alamatKop }; kop(); } }).catch(function () {});
    var dengar = function () { if (!hidup()) { document.removeEventListener('logo-berubah', dengar); return; } gambar(); };
    document.addEventListener('logo-berubah', dengar);
    gambar();
  }

  // ================================================================== BERITA, PENGUMUMAN, REGULASI
  function berita(el, args, q) {
    el.innerHTML = Shell.judul(el, { eyebrow: 'Publikasi', h: 'Berita', p: 'Hanya berita berstatus <b>Tayang</b> yang terlihat di situs. Simpan sebagai Draf bila belum siap.', aksi: situs('#/berita') }) + '<div class="card" id="t"></div>';
    var c = crud($('#t'), {
      tabel: 'WEB_Berita', judul: 'berita', tambah: 'Tulis berita', cari: 'Cari judul atau kategori…', lebar: 'lebar', sortAwal: 'TANGGAL', dirAwal: -1,
      kosong: { ikon: 'newspaper', judul: 'Belum ada berita', teks: 'Tulis berita kegiatan pertama.' },
      kolom: [{ k: 'JUDUL', l: 'Judul', f: function (r) { return '<div class="row">' + (r.GAMBAR_URL ? '<img src="' + esc(r.GAMBAR_URL) + '" alt="" referrerpolicy="no-referrer" style="width:56px;height:40px;object-fit:cover;border-radius:6px">' : '') + '<div><b>' + esc(r.JUDUL) + '</b><div class="tiny muted">' + esc(String(r.RINGKASAN || '').slice(0, 80)) + '</div></div></div>'; } },
        { k: 'TANGGAL', l: 'Tanggal', f: function (r) { return fmt.tgl(r.TANGGAL); } }, { k: 'KATEGORI', l: 'Kategori' },
        { k: 'STATUS', l: 'Status', f: function (r) { return r.STATUS === 'Tayang' ? '<span class="badge b-ok dot">Tayang</span>' : '<span class="badge b-slate">Draf</span>'; } }],
      fields: [{ k: 'JUDUL', l: 'Judul', wajib: true, full: true, maks: 200 }, { k: 'TANGGAL', l: 'Tanggal', t: 'date', awal: fmt.hariIni() },
        { k: 'KATEGORI', l: 'Kategori', t: 'select', opsi: ['Kegiatan', 'Informasi', 'Pengumuman', 'Edukasi', 'Lainnya'], awal: 'Kegiatan' },
        { k: 'STATUS', l: 'Status', t: 'seg', opsi: [{ v: 'Draft', l: 'Draf' }, { v: 'Tayang', l: 'Tayang' }], awal: 'Draft', full: true },
        { k: 'GAMBAR_URL', l: 'Gambar sampul', t: 'berkas', hint: 'JPEG/PNG; dikompres otomatis (± 400 KB).' },
        { k: 'RINGKASAN', l: 'Ringkasan (tampil di kartu)', t: 'textarea', rows: 2, maks: 300 }, { k: 'ISI', l: 'Isi berita', t: 'textarea', rows: 12, wajib: true }]
    });
    if (q.get('baru')) setTimeout(function () { c.form(null); history.replaceState(null, '', '#/berita'); }, 50);
  }

  function pengumuman(el, args, q) {
    el.innerHTML = Shell.judul(el, { eyebrow: 'Publikasi', h: 'Pengumuman', p: 'Pengumuman aktif tampil di pita berjalan (5 terbaru) dan halaman Pengumuman.', aksi: situs('#/pengumuman') }) + '<div class="card" id="t"></div>';
    var c = crud($('#t'), {
      tabel: 'WEB_Pengumuman', judul: 'pengumuman', tambah: 'Buat pengumuman', sortAwal: 'TANGGAL', dirAwal: -1, kosong: { ikon: 'campaign', judul: 'Belum ada pengumuman' },
      kolom: [{ k: 'JUDUL', l: 'Judul', f: function (r) { return '<b>' + esc(r.JUDUL) + '</b>'; } }, { k: 'TANGGAL', l: 'Tanggal', f: function (r) { return fmt.tgl(r.TANGGAL); } },
        { k: 'AKTIF', l: 'Status', f: function (r) { return /^ya$/i.test(r.AKTIF) ? '<span class="badge b-ok dot">Aktif</span>' : '<span class="badge b-slate">Nonaktif</span>'; } }],
      fields: [{ k: 'JUDUL', l: 'Judul', wajib: true, full: true, maks: 200 }, { k: 'TANGGAL', l: 'Tanggal', t: 'date', awal: fmt.hariIni() }, { k: 'AKTIF', l: 'Aktif (tampil di situs)', t: 'switch', awal: 'YA' }, { k: 'ISI', l: 'Isi', t: 'textarea', rows: 6 }]
    });
    if (q.get('baru')) setTimeout(function () { c.form(null); history.replaceState(null, '', '#/pengumuman'); }, 50);
  }

  function regulasi(el, args, q) {
    el.innerHTML = Shell.judul(el, { eyebrow: 'Publikasi', h: 'Regulasi', p: 'Peraturan yang dapat diunduh masyarakat. Unggah PDF resmi (maks. 8 MB).', aksi: situs('#/regulasi') }) + '<div class="card" id="t"></div>';
    var c = crud($('#t'), {
      tabel: 'WEB_Regulasi', judul: 'regulasi', tambah: 'Tambah regulasi', sortAwal: 'TAHUN', dirAwal: -1, kosong: { ikon: 'gavel', judul: 'Belum ada regulasi' },
      kolom: [{ k: 'JUDUL', l: 'Judul', f: function (r) { return '<b>' + esc(r.JUDUL) + '</b>'; } }, { k: 'JENIS', l: 'Jenis' }, { k: 'NOMOR', l: 'Nomor', cls: 'mono' }, { k: 'TAHUN', l: 'Tahun', cls: 'mono' },
        { k: 'FILE_URL', l: 'Berkas', sort: false, f: function (r) { return r.FILE_URL ? '<a href="' + esc(r.FILE_URL) + '" target="_blank" rel="noopener">' + ikon('picture_as_pdf') + 'PDF</a>' : '<span class="badge b-warn">belum ada</span>'; } }],
      fields: [{ k: 'JUDUL', l: 'Judul / tentang', wajib: true, full: true, maks: 300 }, { k: 'JENIS', l: 'Jenis', t: 'select', opsi: ['Perda', 'Perwali', 'Keputusan Wali Kota', 'Undang-Undang', 'Peraturan Pemerintah', 'Peraturan Menteri', 'Lainnya'] },
        { k: 'NOMOR', l: 'Nomor', mono: true, maks: 40 }, { k: 'TAHUN', l: 'Tahun', t: 'number', min: 1945, max: 2100 }, { k: 'FILE_URL', l: 'Berkas PDF', t: 'berkas', terima: 'pdf' }]
    });
    if (q.get('baru')) setTimeout(function () { c.form(null); history.replaceState(null, '', '#/regulasi'); }, 50);
  }

  // ================================================================== SURVEI
  function survei(el) {
    el.innerHTML = Shell.judul(el, { eyebrow: 'Layanan', h: 'Survei Layanan', p: 'Pertanyaan aktif tampil di halaman Survei (nilai 1–5, anonim). Bawaan: 9 unsur Survei Kepuasan Masyarakat.', aksi: situs('#/survei') }) +
      '<div class="grid g4" id="kpi">' + UI.sk.kartu(2) + '</div><div class="grid g2" style="margin-top:16px;align-items:start"><div class="card" id="t"></div><div class="card"><div class="card-h"><h3>Rata-rata per unsur</h3></div><div class="card-b" id="hasil">' + UI.sk.baris(6) + '</div></div></div>';
    crud($('#t'), {
      tabel: 'WEB_Survei_Pertanyaan', judul: 'pertanyaan', tambah: 'Tambah pertanyaan', cari: false, sortAwal: 'NO', perHal: 30,
      kolom: [{ k: 'NO', l: 'No', cls: 'mono', nilaiUrut: function (r) { return Number(r.NO) || 0; } }, { k: 'PERTANYAAN', l: 'Pertanyaan' },
        { k: 'AKTIF', l: 'Aktif', f: function (r) { return /^ya$/i.test(r.AKTIF) ? App.badge('YA') : App.badge('TIDAK'); } }],
      fields: [{ k: 'NO', l: 'Nomor urut', t: 'number', min: 1 }, { k: 'AKTIF', l: 'Aktif', t: 'switch', awal: 'YA' }, { k: 'PERTANYAAN', l: 'Pertanyaan', wajib: true, full: true, maks: 300 }]
    });
    var hidup = Shell.hidup();
    App.swr('konten.survei', {}, { maxAge: 60000, onData: function (s) {
      if (!hidup()) return;
      $('#kpi').innerHTML = '<div class="card stat"><div class="lbl">Indeks (1–5)<span class="ico">' + ikon('star') + '</span></div><div class="val">' + (s.rata ? s.rata.toFixed(2) : '—') + '</div></div><div class="card stat"><div class="lbl">Responden<span class="ico">' + ikon('groups') + '</span></div><div class="val">' + fmt.angka(s.responden) + '</div></div>';
      UI.Chart.batangH($('#hasil'), { item: s.perPertanyaan.map(function (x) { return { l: x.teks + ' (' + (x.rata || 0).toFixed(2) + ')', n: x.rata, warna: '#F2A900' }; }) });
    } }).catch(function (e) { $('#hasil').innerHTML = galat(e); });
  }

  // ================================================================== MULAI
  Shell.mulai({
    modul: 'konten', judul: 'Panel Konten', sub: 'Situs Bidang Sarana Transportasi', judulPendek: 'KONTEN', peran: ['Superadmin', 'Admin Konten'], awal: 'ringkasan',
    menu: [
      { grp: 'Utama', item: [{ h: '#/ringkasan', l: 'Ringkasan', i: 'dashboard' }] },
      { grp: 'Halaman Profil', item: [{ h: '#/teks', l: 'Profil & Sambutan', i: 'article' }, { h: '#/poin', l: 'Visi, Misi, Tugas', i: 'flag' }, { h: '#/struktur', l: 'Struktur Organisasi', i: 'account_tree' }, { h: '#/kontak', l: 'Kontak', i: 'contact_phone' }, { h: '#/logo', l: 'Logo', i: 'image' }] },
      { grp: 'Publikasi', item: [{ h: '#/berita', l: 'Berita', i: 'newspaper' }, { h: '#/pengumuman', l: 'Pengumuman', i: 'campaign' }, { h: '#/regulasi', l: 'Regulasi', i: 'gavel' }] },
      { grp: 'Layanan', item: [{ h: '#/pengaduan', l: 'Pengaduan', i: 'forum', badge: 'aduan' }, { h: '#/survei', l: 'Survei Layanan', i: 'reviews' }] },
      { grp: 'Sistem', item: [{ h: '#/akun', l: 'Kelola Akun', i: 'group', peran: SA }, { h: '#/sistem', l: 'Sistem & Keamanan', i: 'shield', peran: SA }, { h: '#/impor', l: 'Migrasi Data', i: 'sync_alt', peran: SA }] }
    ],
    rute: {
      ringkasan: ringkasan, teks: teks, poin: poin, struktur: struktur, kontak: kontak, logo: logo, berita: berita, pengumuman: pengumuman, regulasi: regulasi, survei: survei,
      pengaduan: function (el, a, q) { Shell.halAduan(el, a, q, { onJumlah: function (n) { Shell.badgeMenu('aduan', n); } }); },
      akun: Shell.halAkun, sistem: Shell.halSistem, impor: Shell.halImpor
    },
    // pemanasan: semua tabel konten ditarik dalam 1–2 eksekusi batch saat browser senggang
    prefetch: function () {
      ['WEB_Konten_Teks', 'WEB_Konten_Poin', 'WEB_Pejabat', 'WEB_Pegawai', 'WEB_Regulasi', 'WEB_Survei_Pertanyaan', 'kontak'].forEach(function (t) { data(t).catch(function () {}); });
    }
  });
  App.daftarSW('sw.js');
})();
