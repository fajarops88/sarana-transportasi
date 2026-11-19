/**
 * simau.js — Modul B: SIMAU (Superadmin, Admin Angkutan, Petugas Angkutan).
 * Data induk (trayek, perusahaan, kendaraan), cek kelengkapan 15 item (1 checklist bernomor tetap per kendaraan
 * + riwayat setiap pemeriksaan), kartu pengawasan (syarat terbit
 * terintegrasi ETLE), riwayat, sanksi 5 tingkat, izin insidentil, fasilitas halte + peta, pengaduan,
 * 7 laporan siap cetak, kelola akun Petugas Angkutan.
 * Kecepatan: daftar kendaraan + data induk dibaca sekali (swr), menu lain dipanaskan lewat batch saat senggang.
 */
(function () {
  'use strict';
  var esc = App.esc, ikon = App.ikon, fmt = App.fmt, $ = App.$, $$ = App.$$;
  var me = App.Sesi.me() || {}, ADM = ['Superadmin', 'Admin Angkutan'], SA = ['Superadmin'];
  var B = null, KND = [];

  // ------------------------------------------------------------------ data bersama
  function boot(cb) { return App.swr('simau.boot', {}, { maxAge: 300000, onData: function (d) { B = d; if (cb) cb(d); } }); }
  var KND_ADA = false, DENGAR = [];
  /** Setiap data kendaraan baru (dari simpanan lokal atau server) diteruskan ke halaman yang masih tampil. */
  function knd(cb, fresh) {
    return App.swr('simau.kendaraan.list', {}, { maxAge: 30000, fresh: fresh, onData: function (d) {
      KND = d; KND_ADA = true; isiDatalist(); if (cb) cb(d);
      DENGAR = DENGAR.filter(function (f) { return f(); });
    } });
  }
  /** siap(cb, ulang) — cb sekali saat data induk + kendaraan tersedia (bisa dari simpanan lokal = instan); ulang() tiap data segar tiba. */
  function siap(cb, ulang) {
    var sudah = false, hidup = Shell.hidup();
    var dilihat = null;   // data kendaraan terakhir yang sudah digambar (cegah gambar ganda)
    var tik = function () { if (!B || !KND_ADA || !hidup() || sudah) return; sudah = true; dilihat = KND; cb(); };
    if (ulang) DENGAR.push(function () { if (!hidup()) return false; if (sudah && KND !== dilihat) { dilihat = KND; ulang(); } return true; });
    return Promise.all([boot(tik), knd(tik)]);
  }
  function cariK(id) { return KND.filter(function (k) { return k.id === id; })[0]; }
  function nn(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function galat(e) { return '<div class="card-b"><div class="note bad">' + ikon('error') + '<div>' + esc(e.message || e) + '</div></div></div>'; }
  function bump() { knd(null, true); App.swr('simau.dashboard', {}, { fresh: true }).catch(function () {}); }
  function persen(p) { return p === null || p === undefined ? '<span class="badge b-slate">belum dicek</span>' : '<b class="mono" style="color:' + (p >= (B ? B.ambang : 50) ? 'var(--ok-tx)' : 'var(--bad-tx)') + '">' + p + '%</b>'; }
  function sisa(k) { if (k.hariSisa === null || k.hariSisa === undefined) return '<span class="muted">—</span>'; return '<span class="tiny" style="color:' + (k.hariSisa < 0 ? 'var(--bad-tx)' : k.hariSisa <= 30 ? 'var(--warn-tx,#B45309)' : 'var(--muted)') + '">' + (k.hariSisa < 0 ? 'lewat ' + (-k.hariSisa) + ' hari' : k.hariSisa + ' hari lagi') + '</span>'; }
  function statusK(k) { return App.badge(k.status) + (k.blokir ? ' ' + App.badge('DIBLOKIR') : '') + (k.peremajaan ? ' <span class="badge b-orange">Peremajaan</span>' : ''); }
  function stat(l, v, i, ft, warna) { return '<div class="card stat"' + (warna ? ' style="border-left:4px solid ' + warna + '"' : '') + '><div class="lbl">' + l + '<span class="ico">' + ikon(i) + '</span></div><div class="val">' + (typeof v === 'number' ? fmt.angka(v) : v) + '</div>' + (ft ? '<div class="ft">' + ft + '</div>' : '') + '</div>'; }

  /** datalist nopol untuk pemilih kendaraan (dipakai semua halaman). */
  function isiDatalist() {
    var dl = document.getElementById('dlKnd');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'dlKnd'; document.body.appendChild(dl); }
    dl.innerHTML = KND.map(function (k) { return '<option value="' + esc(k.nopol) + '">' + esc((k.kodeTrayek ? 'Trayek ' + k.kodeTrayek + ' · ' : '') + (k.pemilik || '')) + '</option>'; }).join('');
  }
  /** pemilih(wadah, { idAwal, onPilih(k), label }) */
  function pemilih(wadah, o) {
    wadah.innerHTML = '<div class="field"><label>' + esc(o.label || 'Kendaraan') + '</label><div class="inp-ico">' + ikon('directions_bus') + '<input class="inp mono" list="dlKnd" placeholder="Ketik nomor polisi, contoh KT 1842 KU" autocomplete="off"></div><div class="hint" data-info>' + KND.length + ' kendaraan terdaftar.</div></div>';
    var inp = $('input', wadah), info = $('[data-info]', wadah), terakhir = null;
    // onPilih hanya dipanggil bila kendaraan BERUBAH — event change saat input kehilangan fokus tidak boleh mereset form
    function cek() {
      var n = nn(inp.value), k = KND.filter(function (x) { return nn(x.nopol) === n; })[0];
      if (k) { info.innerHTML = ikon('check_circle') + ' ' + esc(k.trayek || '-') + ' · ' + esc(k.pemilik || '-'); if (k.id !== terakhir) { terakhir = k.id; o.onPilih(k); } }
      else if (n.length >= 4) { info.textContent = 'Nomor polisi belum terdaftar di SIMAU.'; terakhir = null; }
    }
    inp.addEventListener('change', cek); inp.addEventListener('input', App.debounce(cek, 250));
    if (o.idAwal) { var k = cariK(o.idAwal); if (k) { inp.value = k.nopol; cek(); } }
    return inp;
  }
  function kopHtml(k) {
    return '<div class="kop"><img src="' + App.ROOT + 'icons/logo.svg" alt=""><div class="t"><div>PEMERINTAH KOTA BALIKPAPAN</div><b>' + esc(String(k.dinas || '').toUpperCase()) + '</b><div>' + esc(String(k.bidang || '').toUpperCase()) + '</div>' +
      '<small>' + esc([k.alamat, k.telp ? 'Telp. ' + k.telp : ''].filter(String).join(' • ')) + '</small></div><img src="' + App.ROOT + 'icons/logo.svg" alt="" style="visibility:hidden"></div>';
  }

  // ================================================================== DASHBOARD
  function dashboard(el) {
    var hidup = Shell.hidup();
    el.innerHTML = Shell.judul(el, { eyebrow: 'Ringkasan', h: 'Dashboard Pengawasan', p: 'Kondisi angkutan kota hari ini. Status aktif dihitung dari masa berlaku; blokir dari sanksi SIMAU atau kasus ETLE terbuka.', aksi: '<a class="btn btn-primary" href="#/kendaraan?baru=1">' + ikon('add') + 'Tambah Kendaraan</a><a class="btn btn-amber" href="#/cek">' + ikon('fact_check') + 'Cek Kelengkapan</a>' }) +
      '<div class="grid g4" id="kpi">' + UI.sk.kartu(4) + '</div>' +
      '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>' + ikon('event') + 'Masa berlaku kartu</h3></div><div class="card-b" id="ch"></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ikon('timer') + 'Segera habis (≤ 30 hari)</h3><a href="#/kendaraan?status=HABIS30" class="btn btn-ghost btn-sm">Semua' + ikon('arrow_forward') + '</a></div><div id="habis">' + UI.sk.baris(5) + '</div></div></div>' +
      '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>' + ikon('forum') + 'Pengaduan terbuka <span class="badge b-amber" id="nAdu"></span></h3><a href="#/pengaduan" class="btn btn-ghost btn-sm">Kelola' + ikon('arrow_forward') + '</a></div><div id="adu">' + UI.sk.baris(5) + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ikon('lock') + 'Diblokir kasus ETLE</h3><span class="small muted">kartu tidak dapat diterbitkan</span></div><div id="etle">' + UI.sk.baris(4) + '</div></div></div>';
    App.swr('simau.dashboard', {}, { maxAge: 30000, onData: function (d) {
      if (!hidup()) return;
      var k = d.kpi;
      $('#kpi').innerHTML = stat('Kendaraan terdaftar', k.total, 'directions_bus', fmt.angka(k.aktif) + ' aktif · ' + fmt.angka(k.tidakAktif) + ' tidak aktif') +
        stat('Kartu aktif', k.aktif, 'verified', k.total ? Math.round(k.aktif / k.total * 100) + '% dari armada' : '', 'var(--ok)') +
        stat('Diblokir', k.diblokir, 'lock', 'sanksi pemblokir atau kasus ETLE', 'var(--bad)') + stat('Wajib peremajaan', k.peremajaan, 'autorenew', 'usia lebih dari ' + (B ? B.usiaPeremajaan : 15) + ' tahun', 'var(--amber)');
      var b = d.bucket;
      UI.Chart.batang($('#ch'), { label: ['Lewat', '≤ 30 hr', '31–60', '61–90', '> 90 hr', 'Kosong'], seri: [{ nama: 'Kendaraan', data: [b.lewat, b.d30, b.d60, b.d90, b.lebih, b.kosong] }], tinggi: 200 });
      var baris = function (x, kanan) { return '<a class="row" href="#/kendaraan?q=' + encodeURIComponent(x.nopol) + '" style="padding:10px 18px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none">' + App.plat(x.nopol, true) + '<div class="grow small"><b>' + esc(x.trayek || '-') + '</b><div class="muted tiny">' + esc(x.pemilik || '') + '</div></div>' + kanan + '</a>'; };
      $('#habis').innerHTML = d.segeraHabis.length ? d.segeraHabis.map(function (x) { return baris(x, '<div style="text-align:right"><span class="small">' + fmt.tgl(x.masaBerlaku) + '</span><div>' + sisa(x) + '</div></div>'); }).join('') : '<div class="kosong small">' + ikon('task_alt') + '<div>Tidak ada kartu yang habis dalam 30 hari.</div></div>';
      $('#nAdu').textContent = d.aduanTerbuka || '';
      $('#adu').innerHTML = d.aduanBaru.length ? d.aduanBaru.map(function (a) { return '<a class="row" href="#/pengaduan" style="padding:10px 18px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none">' + (a.nopol ? App.plat(a.nopol, true) : '<span class="mono small">' + esc(a.kode) + '</span>') + '<div class="grow small">' + esc(a.deskripsi.slice(0, 90)) + '<div class="tiny muted">' + esc(a.jenis || '') + ' · ' + fmt.relatif(a.tanggal) + '</div></div>' + App.badge(a.status) + '</a>'; }).join('') : '<div class="kosong small">' + ikon('inbox') + '<div>Tidak ada pengaduan terbuka.</div></div>';
      $('#etle').innerHTML = d.etleBlokir.length ? d.etleBlokir.map(function (x) { return baris(x, '<div class="tiny mono" style="text-align:right">' + x.blokirEtle.map(esc).join('<br>') + '</div>'); }).join('') : '<div class="kosong small">' + ikon('verified_user') + '<div>Tidak ada kendaraan yang tertahan kasus ETLE.</div></div>';
    } }).catch(function (e) { $('#kpi').innerHTML = '<div style="grid-column:1/-1">' + galat(e) + '</div>'; });
  }

  // ================================================================== DATA INDUK: TRAYEK & PERUSAHAAN
  function master(tabel) {
    var T = tabel === 'trayek' ? { judul: 'Trayek', h: 'Trayek Angkutan Kota', ikon: 'route', fk: 'idTrayek',
      kolom: [{ k: 'kode', l: 'Kode', cls: 'mono', nilaiUrut: function (r) { return Number(r.kode) || r.kode; } }, { k: 'nama', l: 'Nama trayek', f: function (r) { return '<b>' + esc(r.nama) + '</b>'; } }, { k: 'ket', l: 'Keterangan' }],
      fields: [{ k: 'kode', l: 'Kode trayek', mono: true, maks: 10, ph: '03' }, { k: 'nama', l: 'Nama / rute', wajib: true, maks: 200, ph: 'Batu Ampar – Pelabuhan Semayang' }, { k: 'ket', l: 'Keterangan', t: 'textarea', rows: 2 }] }
      : { judul: 'Perusahaan', h: 'Perusahaan / Operator', ikon: 'apartment', fk: 'idPerusahaan',
      kolom: [{ k: 'nama', l: 'Nama perusahaan', f: function (r) { return '<b>' + esc(r.nama) + '</b>'; } }, { k: 'alamat', l: 'Alamat' }, { k: 'telp', l: 'Telepon', cls: 'mono' }],
      fields: [{ k: 'nama', l: 'Nama perusahaan / koperasi', wajib: true, full: true, maks: 200 }, { k: 'alamat', l: 'Alamat', t: 'textarea', rows: 2 }, { k: 'telp', l: 'Telepon', ph: '08xxxxxxxxxx' }] };
    return function (el) {
      var hidup = Shell.hidup();
      el.innerHTML = Shell.judul(el, { eyebrow: 'Data induk', h: T.h, p: 'Data induk tidak dapat dihapus selama masih dipakai kendaraan.' }) + '<div class="card" id="t">' + UI.sk.baris(6) + '</div>';
      var tbl = null;
      function gambar() {
        if (!hidup()) return;
        var list = B[tabel], jml = {}; KND.forEach(function (k) { jml[k[T.fk]] = (jml[k[T.fk]] || 0) + 1; });
        list.forEach(function (r) { r.jumlah = jml[r.id] || 0; });
        if (!tbl) tbl = UI.Tabel($('#t'), {
          cari: 'Cari ' + T.judul.toLowerCase() + '…', perHal: 25, sortAwal: tabel === 'trayek' ? 'kode' : 'nama',
          toolbar: '<button class="btn btn-primary" id="tambah">' + ikon('add') + 'Tambah ' + T.judul.toLowerCase() + '</button>',
          kolom: T.kolom.concat([{ k: 'jumlah', l: 'Kendaraan', cls: 'right', f: function (r) { return '<a href="#/kendaraan?' + (tabel === 'trayek' ? 'trayek' : 'perusahaan') + '=' + r.id + '">' + r.jumlah + '</a>'; } },
            { l: '', cls: 'aksi', sort: false, f: function (r) { return r.jumlah ? '' : '<button class="btn btn-ghost btn-icon btn-sm" data-aksi="hapus" title="Hapus" style="color:var(--bad)">' + ikon('delete') + '</button>'; } }]),
          data: list, onRow: form, onAksi: function (a, r) { if (a === 'hapus') buang(r); }, kosong: { ikon: T.ikon, judul: 'Belum ada ' + T.judul.toLowerCase() }
        }); else tbl.setData(list);
        $('#tambah').onclick = function () { form(null); };
      }
      function form(r) {
        var baru = !r; r = r || {};
        UI.Modal.buka({ judul: (baru ? 'Tambah ' : 'Ubah ') + T.judul.toLowerCase(), isi: '<form id="fM">' + UI.Form.bangun(T.fields, r) + '</form>',
          tombol: [{ l: 'Batal' }, { l: 'Simpan', cls: 'btn-primary', aksi: function (b, p) {
            var f = $('#fM', p); if (!UI.Form.wajib(f)) return false;
            var row = UI.Form.data(f); if (!baru) row.id = r.id;
            return App.api('simau.master.simpan', { tabel: tabel, row: row }).then(function (x) {
              row.id = x.id; B[tabel] = baru ? B[tabel].concat([row]) : B[tabel].map(function (o) { return o.id === row.id ? Object.assign(o, row) : o; });
              gambar(); App.toast('Tersimpan.', 'ok'); App.swr('simau.boot', {}, { fresh: true }).then(function (d) { B = d; gambar(); }, function () {});
            });
          } }] });
      }
      function buang(r) {
        UI.Modal.konfirm('Hapus <b>' + esc(r.nama) + '</b>?', { ok: 'Hapus', bahaya: true }).then(function (ok) {
          if (ok) App.api('simau.master.hapus', { tabel: tabel, id: r.id }).then(function () { B[tabel] = B[tabel].filter(function (o) { return o.id !== r.id; }); gambar(); App.toast('Dihapus.', 'ok'); App.swr('simau.boot', {}, { fresh: true }).then(function (d) { B = d; }); }, function (e) { App.toast(e.message, 'bad'); });
        });
      }
      siap(gambar, gambar).catch(function (e) { if (hidup()) $('#t').innerHTML = galat(e); });
    };
  }

  // ================================================================== KENDARAAN
  function formKendaraan(r, selesai) {
    var baru = !r; r = r || {};
    UI.Modal.buka({
      judul: baru ? 'Tambah kendaraan' : 'Ubah kendaraan ' + r.nopol, lebar: 'lebar',
      isi: '<form id="fK">' + UI.Form.bangun([
        { k: 'nopol', l: 'Nomor polisi', wajib: true, mono: true, maks: 12, ph: 'KT 1842 KU', atr: ' style="text-transform:uppercase"' },
        { k: 'masaBerlaku', l: 'Masa berlaku kartu', t: 'date', wajib: true, hint: 'Status AKTIF dihitung otomatis dari tanggal ini.' },
        { k: 'idTrayek', l: 'Trayek', t: 'select', wajib: true, kosong: 'Pilih trayek…', opsi: B.trayek.map(function (t) { return { v: t.id, l: (t.kode ? t.kode + ' — ' : '') + t.nama }; }) },
        { k: 'idPerusahaan', l: 'Perusahaan', t: 'select', wajib: true, kosong: 'Pilih perusahaan…', opsi: B.perusahaan.map(function (p) { return { v: p.id, l: p.nama }; }) },
        { k: 'pemilik', l: 'Nama pemilik (STNK)', maks: 150 }, { k: 'tahun', l: 'Tahun pembuatan', t: 'number', min: 1970, max: 2100, hint: 'Lebih dari ' + B.usiaPeremajaan + ' tahun = wajib peremajaan.' },
        { k: 'alamat', l: 'Alamat pemilik', t: 'textarea', rows: 2 }], r) + '</form>',
      tombol: [{ l: 'Batal' }, { l: 'Simpan', cls: 'btn-primary', ikon: 'save', aksi: function (b, p) {
        var f = $('#fK', p); if (!UI.Form.wajib(f)) return false;
        var row = UI.Form.data(f); if (!baru) row.id = r.id;
        return App.api('simau.kendaraan.simpan', { row: row }).then(function (x) { App.toast(baru ? 'Kendaraan ditambahkan.' : 'Data kendaraan diperbarui.', 'ok'); bump(); if (selesai) selesai(x.id); });
      } }]
    });
  }

  function kendaraan(el, args, q) {
    var hidup = Shell.hidup();
    el.innerHTML = Shell.judul(el, { eyebrow: 'Data induk', h: 'Data Kendaraan', p: 'Klik baris untuk detail dan tindakan: cek kelengkapan, kartu, riwayat, sanksi, izin insidentil.', aksi: '<button class="btn btn-outline" id="ekspor">' + ikon('download') + 'Ekspor Excel</button><button class="btn btn-primary" id="tambah">' + ikon('add') + 'Tambah Kendaraan</button>' }) +
      '<div class="card" id="t">' + UI.sk.baris(10) + '</div>';
    var tbl = null;
    function gambar() {
      if (!hidup()) return;
      if (!tbl) {
        tbl = UI.Tabel($('#t'), {
          cari: 'Cari nopol, pemilik, trayek, perusahaan…', perHal: 20, sortAwal: 'nopol',
          saringHtml: '<select class="sel" data-saring="status" style="width:170px;height:38px"><option value="">Semua status</option><option value="AKTIF">Aktif</option><option value="TIDAK AKTIF">Tidak aktif</option><option value="HABIS30">Habis ≤ 30 hari</option><option value="DIBLOKIR">Diblokir</option><option value="PEREMAJAAN">Wajib peremajaan</option><option value="BELUMCEK">Belum pernah dicek</option></select>' +
            '<select class="sel" data-saring="idTrayek" style="width:190px;height:38px"><option value="">Semua trayek</option>' + B.trayek.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc((t.kode ? t.kode + ' — ' : '') + t.nama) + '</option>'; }).join('') + '</select>',
          saring: function (r, k, v) {
            if (k === 'status') return v === 'DIBLOKIR' ? r.blokir : v === 'PEREMAJAAN' ? r.peremajaan : v === 'HABIS30' ? r.hariSisa !== null && r.hariSisa >= 0 && r.hariSisa <= 30 : v === 'BELUMCEK' ? r.kelengkapan === null : r.status === v;
            return r[k] === v;
          },
          kolom: [
            { k: 'nopol', l: 'Nomor polisi', f: function (r) { return App.plat(r.nopol, true); }, nilaiUrut: function (r) { return nn(r.nopol); } },
            { k: 'trayek', l: 'Trayek', f: function (r) { return (r.kodeTrayek ? '<b class="mono">' + esc(r.kodeTrayek) + '</b> ' : '') + '<span class="small">' + esc(r.trayek) + '</span>'; } },
            { k: 'pemilik', l: 'Pemilik', f: function (r) { return esc(r.pemilik) + '<div class="tiny muted">' + esc(r.perusahaan) + '</div>'; }, cariNilai: function (r) { return r.pemilik + ' ' + r.perusahaan; } },
            { k: 'tahun', l: 'Tahun', cls: 'mono', f: function (r) { return esc(r.tahun || '-') + (r.usia !== null ? '<div class="tiny muted">' + r.usia + ' th</div>' : ''); } },
            { k: 'masaBerlaku', l: 'Masa berlaku', f: function (r) { return fmt.tgl(r.masaBerlaku) + '<div>' + sisa(r) + '</div>'; } },
            { k: 'kelengkapan', l: 'Kelengkapan', cls: 'right', f: function (r) { return persen(r.kelengkapan); }, nilaiUrut: function (r) { return r.kelengkapan === null ? -1 : r.kelengkapan; } },
            { k: 'status', l: 'Status', f: statusK }
          ],
          data: KND, onRow: detail, kosong: { ikon: 'directions_bus', judul: 'Belum ada kendaraan', teks: 'Tambah kendaraan atau jalankan Migrasi Data dari SIMAU lama.' }
        });
        var pra = function (sel, v) { var s = $('[data-saring="' + sel + '"]', $('#t')); if (s && v) { s.value = v; s.dispatchEvent(new Event('change')); } };
        pra('status', q.get('status')); pra('idTrayek', q.get('trayek'));
        if (q.get('perusahaan')) { tbl.st.filter.idPerusahaan = q.get('perusahaan'); tbl.render(); }
        if (q.get('q')) { var qi = $('[data-q]', $('#t')); qi.value = q.get('q'); qi.dispatchEvent(new Event('input')); }
      } else tbl.setData(KND);
    }
    function detail(k) {
      var adm = ADM.indexOf(me.role) > -1;
      var lc = UI.Laci.buka({
        judul: k.nopol,
        isi: '<div class="stack"><div class="row wrap-row">' + App.plat(k.nopol, true).replace('plate', 'plate xl') + statusK(k) + '</div>' +
          (k.blokir ? '<div class="note crit">' + ikon('lock') + '<div><b>Diblokir.</b> ' + (k.blokirSanksi ? k.blokirSanksi + ' sanksi pemblokir aktif. ' : '') + (k.blokirEtle.length ? 'Kasus ETLE terbuka: ' + k.blokirEtle.map(esc).join(', ') + '.' : '') + '</div></div>' : '') +
          '<div class="dl"><div><dt>Trayek</dt><dd>' + esc((k.kodeTrayek ? k.kodeTrayek + ' — ' : '') + k.trayek) + '</dd></div><div><dt>Perusahaan</dt><dd>' + esc(k.perusahaan || '-') + '</dd></div>' +
          '<div><dt>Pemilik</dt><dd>' + esc(k.pemilik || '-') + '<div class="small muted">' + esc(k.alamat || '') + '</div></dd></div><div><dt>Tahun / usia</dt><dd>' + esc(k.tahun || '-') + (k.usia !== null ? ' (' + k.usia + ' tahun)' : '') + '</dd></div>' +
          '<div><dt>Masa berlaku</dt><dd>' + fmt.tglP(k.masaBerlaku) + '<div>' + sisa(k) + '</div></dd></div><div><dt>Kelengkapan terakhir</dt><dd>' + persen(k.kelengkapan) + (k.tglCek ? '<div class="tiny muted">' + fmt.tglJam(k.tglCek) + '</div>' : '') + (k.idCek ? '<div class="tiny muted"><span class="mono">' + esc(k.idCek) + '</span> · ' + k.jumlahCek + '× diperiksa</div>' : '') + '</dd></div></div>' +
          '<div class="grid g2" style="gap:8px">' + [['#/cek?id=' + k.id, 'fact_check', 'Cek kelengkapan'], ['#/kartu?id=' + k.id, 'badge', 'Kartu pengawasan'], ['#/riwayat?id=' + k.id, 'history', 'Riwayat'], ['#/sanksi?id=' + k.id, 'gavel', 'Catat sanksi'], ['#/insidentil?id=' + k.id, 'event_available', 'Izin insidentil']].map(function (x) {
            return '<a class="btn btn-outline" href="' + x[0] + '" data-tutup-laci>' + ikon(x[1]) + x[2] + '</a>';
          }).join('') + '</div><div class="tiny muted">ID ' + esc(k.id) + ' · diinput ' + fmt.tglJam(k.input) + '</div></div>',
        kaki: '<button class="btn btn-ghost" id="hapusK" style="color:var(--bad);margin-right:auto">' + ikon('delete') + 'Hapus</button><button class="btn btn-primary" id="ubahK">' + ikon('edit') + 'Ubah data</button>'
      });
      $$('[data-tutup-laci]', lc.el).forEach(function (a) { a.addEventListener('click', function () { lc.tutup(); }); });
      $('#ubahK').onclick = function () { lc.tutup(); formKendaraan(k); };
      $('#hapusK').onclick = function () {
        UI.Modal.konfirm('Hapus kendaraan <b>' + esc(k.nopol) + '</b>? Riwayat cek dan sanksi tetap tersimpan.', { ok: 'Hapus', bahaya: true, ketik: k.nopol.replace(/\s/g, '') }).then(function (ok) {
          if (ok) App.api('simau.kendaraan.hapus', { id: k.id }).then(function () { lc.tutup(); KND = KND.filter(function (x) { return x.id !== k.id; }); gambar(); App.toast('Kendaraan dihapus.', 'ok'); bump(); }, function (e) { App.toast(e.message, 'bad'); });
        });
      };
      if (!adm) $('#hapusK').classList.add('hide');
    }
    $('#tambah').onclick = function () { formKendaraan(null); };
    $('#ekspor').onclick = function () {
      App.Xlsx.unduh('Kendaraan-SIMAU-' + fmt.hariIni(), [{ nama: 'Kendaraan', kolom: ['Nomor Polisi', 'Kode Trayek', 'Trayek', 'Perusahaan', 'Pemilik', 'Alamat', 'Tahun', 'Usia', 'Masa Berlaku', 'Sisa Hari', 'Kelengkapan %', 'Status', 'Diblokir', 'Wajib Peremajaan'],
        baris: (tbl ? tbl.tersaring() : KND).map(function (k) { return [k.nopol, k.kodeTrayek, k.trayek, k.perusahaan, k.pemilik, k.alamat, k.tahun, k.usia === null ? '' : k.usia, k.masaBerlaku, k.hariSisa === null ? '' : k.hariSisa, k.kelengkapan === null ? '' : k.kelengkapan, k.status, k.blokir ? 'YA' : 'TIDAK', k.peremajaan ? 'YA' : 'TIDAK']; }) }]);
    };
    siap(function () { gambar(); if (q.get('baru')) { history.replaceState(null, '', '#/kendaraan'); formKendaraan(null); } }, gambar).catch(function (e) { if (hidup()) $('#t').innerHTML = galat(e); });
  }

  // ================================================================== CEK KELENGKAPAN
  function cincin(p, ambang) {
    var r = 52, kel = 2 * Math.PI * r, warna = p >= ambang ? 'var(--ok)' : 'var(--bad)';
    return '<svg viewBox="0 0 130 130" width="150" height="150" style="display:block;margin:0 auto"><circle cx="65" cy="65" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="12"/><circle cx="65" cy="65" r="' + r + '" fill="none" stroke="' + warna + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (kel * p / 100) + ' ' + kel + '" transform="rotate(-90 65 65)"/>' +
      '<text x="65" y="66" text-anchor="middle" style="font-size:26px;font-weight:700;fill:var(--ink)">' + (Math.round(p * 10) / 10) + '%</text></svg>';
  }
  function cek(el, args, q) {
    var hidup = Shell.hidup(), CEKS = [], pilih = null, tersimpan = false;
    el.innerHTML = Shell.judul(el, { eyebrow: 'Pemeriksaan', h: 'Cek Kelengkapan Angkutan Kota', p: 'Setiap kendaraan punya <b>satu checklist bernomor tetap</b>; setiap pemeriksaan tercatat di riwayatnya. Item lengkap bila <b>Ada</b> DAN <b>Baik</b>. Kartu pengawasan hanya terbit bila kelengkapan terakhir ≥ 50%.' }) +
      '<div class="card card-b" id="pil"></div><div id="isiCek" style="margin-top:16px"></div>' +
      '<div class="card" style="margin-top:20px"><div class="card-h"><h3>' + ikon('fact_check') + 'Checklist kendaraan</h3><span class="tiny muted">1 baris per kendaraan · klik baris untuk riwayat pemeriksaan</span></div><div id="tCek">' + UI.sk.baris(5) + '</div></div>';
    function milik(idK) { return CEKS.filter(function (c) { return c.idKendaraan === idK; })[0]; }
    function infoChecklist(k) {
      var c = milik(k.id), w = $('#infoCk'), b = $('#salinAkhir');
      if (!w) return;
      w.innerHTML = c && c.jumlah ? ikon('fact_check') + '<div class="small">Checklist <b class="mono">' + esc(c.id) + '</b> · sudah diperiksa <b>' + c.jumlah + '×</b> · terakhir ' + fmt.tglJam(c.tanggal) + ' (' + persen(c.persen) + '). Pemeriksaan ini akan tercatat sebagai <b>ke-' + (c.jumlah + 1) + '</b> dengan nomor checklist yang sama.</div>'
        : c ? ikon('fact_check') + '<div class="small">Checklist <b class="mono">' + esc(c.id) + '</b> · belum ada pemeriksaan tersimpan. Nomor ini tetap milik kendaraan ini.</div>'
        : ikon('add_task') + '<div class="small">Kendaraan ini belum punya checklist. Nomornya dibuat saat pemeriksaan pertama disimpan dan <b>tidak berubah</b> pada pemeriksaan berikutnya.</div>';
      if (b) b.classList.toggle('hide', !(c && c.jumlah));
    }
    function formCek(k) {
      pilih = k; tersimpan = false;
      var L = B.perlengkapan, ambang = B.ambang;
      $('#isiCek').innerHTML = '<div class="note" id="infoCk" style="margin-bottom:12px"></div><div class="grid" style="grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start" id="gridCek"><form class="card" id="fCek"><div class="card-h" style="flex-wrap:wrap;gap:8px"><div><h3>15 komponen kelengkapan</h3><div class="tiny muted">' + App.plat(k.nopol, true) + ' ' + esc(k.trayek || '') + '</div></div>' +
        '<div class="row wrap-row"><button type="button" class="btn btn-ghost btn-sm hide" id="salinAkhir" title="Isi formulir dengan hasil pemeriksaan terakhir, lalu ubah yang berbeda">' + ikon('content_copy') + 'Salin cek terakhir</button><button type="button" class="btn btn-outline btn-sm" id="semua">' + ikon('done_all') + 'Semua Ada & Baik</button><button type="button" class="btn btn-ghost btn-sm" id="reset">Kosongkan</button></div></div>' +
        L.map(function (p, i) {
          return '<div class="row wrap-row" data-k="' + p.k + '" style="padding:12px 18px;border-bottom:1px solid var(--line)"><span class="badge b-slate mono" style="min-width:30px;justify-content:center">' + (i + 1) + '</span><div class="grow" style="min-width:200px"><b class="small">' + esc(p.l) + '</b></div>' +
            '<div class="seg ok"><label><input type="radio" name="' + p.k + '_k" value="Ada">Ada</label><label><input type="radio" name="' + p.k + '_k" value="Tidak">Tidak</label></div>' +
            '<div class="seg ok"><label><input type="radio" name="' + p.k + '_c" value="Baik">Baik</label><label><input type="radio" name="' + p.k + '_c" value="Buruk">Buruk</label></div></div>';
        }).join('') + '</form>' +
        '<div class="stack" style="position:sticky;top:84px"><div class="card card-b center"><div class="eyebrow" style="justify-content:center">Tingkat kelengkapan</div><div id="ring"></div><div class="small muted" id="nItem"></div>' +
        '<div class="note" style="text-align:left;margin-top:12px">' + ikon('rule') + '<div class="small">Ambang minimum <b>' + ambang + '%</b> (Perda Kota Balikpapan No. 7 Tahun 2022). Item belum diisi dihitung tidak lengkap.</div></div><div id="vonis" style="margin-top:10px"></div></div>' +
        '<div class="card card-b stack"><div class="dl"><div><dt>Petugas pemeriksa</dt><dd>' + esc(me.nama || me.email) + '</dd></div><div><dt>Tanggal</dt><dd>' + fmt.tglP(fmt.hariIni()) + '</dd></div></div>' +
        '<button class="btn btn-primary btn-block" id="simpanCek">' + ikon('save') + 'Simpan pemeriksaan</button><a class="btn btn-amber btn-block hide" id="keKartu" href="#/kartu?id=' + k.id + '">' + ikon('badge') + 'Lanjut ke kartu pengawasan</a></div></div></div>';
      if (window.innerWidth < 1100) $('#gridCek').style.gridTemplateColumns = 'minmax(0,1fr)';
      infoChecklist(k);
      var f = $('#fCek');
      function hitung() {
        var n = 0, isi = 0;
        L.forEach(function (p) {
          var a = f[p.k + '_k'].value, c = f[p.k + '_c'].value, baris = $('[data-k="' + p.k + '"]', f);
          if (a) isi++;
          $$('input[name="' + p.k + '_c"]', f).forEach(function (x) { x.disabled = a === 'Tidak'; x.closest('label').style.opacity = a === 'Tidak' ? '.4' : ''; });
          if (a === 'Tidak' && c) $$('input[name="' + p.k + '_c"]', f).forEach(function (x) { x.checked = false; });
          var ok = a === 'Ada' && f[p.k + '_c'].value === 'Baik'; if (ok) n++;
          baris.style.background = ok ? 'var(--ok-bg)' : '';
        });
        var pr = Math.round(n / L.length * 1000) / 10;
        $('#ring').innerHTML = cincin(pr, ambang);
        $('#nItem').textContent = n + ' dari ' + L.length + ' item lengkap · ' + isi + ' item terisi';
        $('#vonis').innerHTML = pr >= ambang ? '<div class="note ok">' + ikon('check_circle') + '<div class="small"><b>Memenuhi syarat</b> kelengkapan kartu.</div></div>' : '<div class="note bad">' + ikon('cancel') + '<div class="small"><b>Belum memenuhi</b> — kartu akan ditolak.</div></div>';
        return pr;
      }
      f.addEventListener('change', hitung);
      $('#semua').onclick = function () { L.forEach(function (p) { f[p.k + '_k'].value = 'Ada'; f[p.k + '_c'].value = 'Baik'; }); hitung(); };
      $('#reset').onclick = function () { $$('input[type=radio]', f).forEach(function (x) { x.checked = false; }); hitung(); };
      $('#salinAkhir').onclick = function () {
        var c = milik(k.id); if (!c) return;
        $$('input[type=radio]', f).forEach(function (x) { x.checked = false; });
        L.forEach(function (p) { var v = c.item[p.k] || []; if (v[0]) f[p.k + '_k'].value = v[0]; if (v[1]) f[p.k + '_c'].value = v[1]; });
        hitung(); App.toast('Formulir diisi dari pemeriksaan ' + fmt.tgl(c.tanggal) + '. Ubah item yang berbeda sebelum menyimpan.', 'ok');
      };
      hitung();
      $('#simpanCek').onclick = function () {
        var item = {}, kosong = 0;
        L.forEach(function (p) { var a = f[p.k + '_k'].value, c = f[p.k + '_c'].value; if (!a) kosong++; item[p.k] = [a, a === 'Ada' ? c : '']; });
        var go = function () {
          UI.Form.muat($('#simpanCek'), App.api('simau.cek.simpan', { idKendaraan: k.id, item: item })).then(function (r) {
            tersimpan = true;
            App.toast('Pemeriksaan ke-' + r.ke + ' tersimpan di checklist ' + r.id + ': ' + r.persen + '%.', r.lolos ? 'ok' : 'warn');
            $('#simpanCek').disabled = true; $('#simpanCek').innerHTML = ikon('task_alt') + 'Tersimpan · ' + esc(r.id) + ' ke-' + r.ke + ' (' + r.persen + '%)';
            $('#infoCk').innerHTML = ikon('task_alt') + '<div class="small">Tersimpan sebagai <b>pemeriksaan ke-' + r.ke + '</b> di checklist <b class="mono">' + esc(r.id) + '</b>' + (r.baru ? ' (checklist baru untuk kendaraan ini)' : '') + '.</div>';
            if (r.lolos) $('#keKartu').classList.remove('hide');
            k.kelengkapan = r.persen; bump(); muatDaftar(true);
          }, function (e) { App.toast(e.message, 'bad'); });
        };
        if (kosong) UI.Modal.konfirm(kosong + ' item belum diisi dan akan dihitung tidak lengkap. Simpan sekarang?', { ok: 'Simpan' }).then(function (ok) { if (ok) go(); }); else go();
      };
    }
    var tbl = null;
    function muatDaftar(fresh) {
      return App.swr('simau.cek.list', {}, { maxAge: 30000, fresh: fresh, onData: function (d) {
        if (!hidup()) return;
        CEKS = d; if (pilih && !tersimpan) infoChecklist(pilih);
        if (!tbl) tbl = UI.Tabel($('#tCek'), { cari: 'Cari nomor checklist, nopol, atau petugas…', perHal: 10, data: d,
          kolom: [{ k: 'id', l: 'No. checklist', f: function (r) { return '<b class="mono">' + esc(r.id) + '</b>'; } },
            { k: 'nopol', l: 'Nopol', f: function (r) { return App.plat(r.nopol, true) + (r.ada ? '' : ' <span class="badge b-slate">kendaraan dihapus</span>'); } },
            { k: 'persen', l: 'Kelengkapan terakhir', cls: 'right', f: function (r) { return persen(r.persen); } },
            { k: 'tanggal', l: 'Pemeriksaan terakhir', f: function (r) { return r.tanggal ? fmt.tglJam(r.tanggal) : '<span class="muted">—</span>'; } },
            { k: 'jumlah', l: 'Diperiksa', cls: 'right', f: function (r) { return '<span class="mono">' + r.jumlah + '×</span>'; } },
            { k: 'petugas', l: 'Petugas terakhir', f: function (r) { return '<span class="small">' + esc(r.petugas || '-') + '</span>'; } }],
          onRow: lihat, kosong: { ikon: 'fact_check', judul: 'Belum ada checklist' } });
        else tbl.setData(d);
      } }).catch(function (e) { $('#tCek').innerHTML = galat(e); });
    }
    function tabelItem(item) {
      return '<table class="tbl" style="margin-top:8px"><thead><tr><th>#</th><th>Komponen</th><th>Keberadaan</th><th>Kondisi</th></tr></thead><tbody>' +
        (B ? B.perlengkapan : []).map(function (p, i) { var v = item[p.k] || []; return '<tr><td class="mono">' + (i + 1) + '</td><td>' + esc(p.l) + '</td><td>' + (v[0] ? App.badge(v[0] === 'Ada' ? 'Ada' : 'Tidak', v[0] === 'Ada' ? 'b-ok' : 'b-bad') : '—') + '</td><td>' + (v[1] ? App.badge(v[1], v[1] === 'Baik' ? 'b-ok' : 'b-bad') : '—') + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    /** Riwayat satu checklist: setiap pemeriksaan dengan tanggal, hasil, petugas; rincian & hapus per pemeriksaan. */
    function lihat(r) {
      var adm = ADM.indexOf(me.role) > -1;
      var m = UI.Modal.buka({ judul: 'Checklist ' + r.id + ' · ' + r.nopol, lebar: 'lebar',
        isi: '<div class="row wrap-row" style="margin-bottom:12px">' + App.plat(r.nopol, true) + persen(r.persen) + '<span class="small muted" id="ringkasCk">' + r.jumlah + '× diperiksa' + (r.pertama ? ' · pertama ' + fmt.tgl(r.pertama) : '') + '</span></div><div id="rwCk">' + UI.sk.baris(4) + '</div>',
        tombol: (r.ada ? [{ l: 'Periksa lagi', cls: 'btn-outline', aksi: function () { location.hash = '#/cek?id=' + encodeURIComponent(r.idKendaraan); } }] : []).concat([{ l: 'Tutup', cls: 'btn-primary' }]) });
      function muat(fresh) {
        App.swr('simau.cek.riwayat', { id: r.id }, { maxAge: 0, fresh: fresh, onData: function (d) {
          var w = $('#rwCk', m.el); if (!w) return;
          var rs = $('#ringkasCk', m.el); if (rs) rs.textContent = d.riwayat.length + '× diperiksa' + (d.checklist && d.checklist.pertama ? ' · pertama ' + fmt.tgl(d.checklist.pertama) : '');
          if (!d.riwayat.length) { w.innerHTML = '<div class="kosong">' + ikon('history') + '<h4>Belum ada pemeriksaan</h4><p class="small muted">Nomor ' + esc(r.id) + ' tetap milik kendaraan ini.</p></div>'; return; }
          w.innerHTML = '<div class="tl">' + d.riwayat.map(function (x, i) {
            return '<div class="tl-i' + (i === 0 ? ' on' : '') + '"><span class="dot">' + ikon('fact_check') + '</span>' +
              '<div class="row between wrap-row"><b>Pemeriksaan ke-' + x.ke + (i === 0 ? ' <span class="badge b-ok">terakhir</span>' : '') + '</b><span class="small muted">' + fmt.tglJam(x.tanggal) + '</span></div>' +
              '<div class="row wrap-row small" style="gap:8px">' + persen(x.persen) + '<span class="muted grow">' + esc(x.petugas || '-') + (x.idLama ? ' · ID lama ' + esc(x.idLama) : '') + '</span>' +
              '<button class="btn btn-ghost btn-sm" data-rinci="' + i + '">' + ikon('list') + 'Rincian</button>' +
              (adm ? '<button class="btn btn-ghost btn-sm" data-hapus="' + i + '" style="color:var(--bad)" title="Hapus pemeriksaan ini dari riwayat">' + ikon('delete') + '</button>' : '') + '</div>' +
              (x.catatan ? '<div class="tiny muted">' + esc(x.catatan) + '</div>' : '') + '<div data-isi="' + i + '"></div></div>';
          }).join('') + '</div>';
          $$('[data-rinci]', w).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-rinci'), wadah = $('[data-isi="' + i + '"]', w); wadah.innerHTML = wadah.innerHTML ? '' : tabelItem(d.riwayat[i].item); }; });
          $$('[data-hapus]', w).forEach(function (b) {
            b.onclick = function () {
              var x = d.riwayat[+b.getAttribute('data-hapus')];
              UI.Modal.konfirm('Hapus pemeriksaan ke-' + x.ke + ' (' + fmt.tglJam(x.tanggal) + ') dari riwayat ' + esc(r.id) + '? Nomor checklist tetap; isi checklist kembali ke pemeriksaan terakhir yang tersisa.', { ok: 'Hapus', bahaya: true }).then(function (ok) {
                if (!ok) return;
                App.api('simau.cek.hapus', { id: x.id }).then(function (h) {
                  App.toast(h.sisa ? 'Pemeriksaan dihapus. ' + h.idCek + ' kini berisi pemeriksaan terakhir yang tersisa.' : 'Pemeriksaan dihapus. ' + h.idCek + ' kosong; nomornya tetap.', 'ok');
                  muat(true); muatDaftar(true); bump();
                }, function (e) { App.toast(e.message, 'bad'); });
              });
            };
          });
        } }).catch(function (e) { var w = $('#rwCk', m.el); if (w) w.innerHTML = galat(e); });
      }
      muat();
    }
    siap(function () { pemilih($('#pil'), { idAwal: q.get('id'), onPilih: formCek, label: 'Kendaraan yang diperiksa' }); }).catch(function (e) { $('#pil').innerHTML = galat(e); });
    muatDaftar();
  }

  // ================================================================== KARTU PENGAWASAN
  function kartuHtml(d, t, ukuran) {
    var k = d.kendaraan;
    var baris = [['Nomor kendaraan', '<b class="mono" style="font-size:15px">' + esc(k.nopol) + '</b>'], ['Nama pemilik', esc(k.pemilik || '-')], ['Alamat pemilik', esc(k.alamat || '-')], ['Trayek', esc((k.kodeTrayek ? k.kodeTrayek + ' — ' : '') + (k.trayek || '-'))],
      ['Perusahaan / operator', esc(k.perusahaan || '-')], ['Tahun pembuatan', esc(k.tahun || '-')], ['Masa berlaku', '<b>' + fmt.tglP(k.masaBerlaku) + '</b>']];
    return '<div class="kertas ' + (ukuran === 'A4' ? 'a4' : 'a5l') + '">' + kopHtml(d.kop) + '<h2>KARTU PENGAWASAN ANGKUTAN KOTA</h2><div class="no">Nomor: ' + esc(d.nomor) + '</div>' +
      '<table class="data">' + baris.map(function (b) { return '<tr><td>' + b[0] + '</td><td>: ' + b[1] + '</td></tr>'; }).join('') + '</table>' +
      '<div class="ttd"><div style="display:flex;gap:10px;align-items:flex-end">' + (d.qr ? '<img src="' + UI.qrUrl(d.qr, 220) + '" alt="QR verifikasi" style="width:96px;height:96px">' : '') + '<div class="tiny" style="max-width:150px;color:#374151">Pindai untuk memeriksa keaslian dan status kartu secara langsung.</div></div>' +
      '<div class="k">Balikpapan, ' + fmt.tglP(fmt.hariIni()) + '<br>' + esc(t.jabatan || '[jabatan penandatangan]') + '<div class="sp"></div><b style="text-decoration:underline">' + esc(t.nama || '[nama pejabat]') + '</b><br>' + (t.nip ? 'NIP. ' + esc(t.nip) : '') + '</div></div>' +
      '<div class="tiny" style="margin-top:10px;color:#64748B;border-top:1px solid #CBD5E1;padding-top:6px">Dasar: Peraturan Daerah Kota Balikpapan Nomor 7 Tahun 2022. Kartu wajib dibawa dan ditempatkan pada kendaraan.</div></div>';
  }
  function kartu(el, args, q) {
    el.innerHTML = Shell.judul(el, { eyebrow: 'Pemeriksaan', h: 'Kartu Pengawasan', p: 'Kartu hanya dapat dicetak bila ketiga syarat lolos. Syarat diperiksa ulang ke server setiap kali kartu dibuka.' }) +
      '<div class="card card-b" id="pil"></div><div id="isiK" style="margin-top:16px"></div>';
    var T = {}; try { T = JSON.parse(sessionStorage.getItem('ttd_kartu') || '{}'); } catch (e) {}
    function tampil(k) {
      $('#isiK').innerHTML = '<div class="card">' + UI.sk.baris(8) + '</div>';
      var hidup = Shell.hidup();
      App.api('simau.kartu', { id: k.id }).then(function (d) {
        if (!hidup()) return;
        if (d.ttd && !T.nama) T = d.ttd;
        $('#isiK').innerHTML = '<div class="grid" style="grid-template-columns:340px minmax(0,1fr);gap:16px;align-items:start" id="gridK"><div class="stack">' +
          '<div class="card"><div class="card-h"><h3>' + ikon('verified_user') + 'Verifikasi syarat</h3>' + (d.bolehTerbit ? '<span class="badge b-ok">LOLOS</span>' : '<span class="badge b-bad">DITOLAK</span>') + '</div><div class="card-b stack">' +
          d.syarat.map(function (s) { return '<div class="note ' + (s.lolos ? 'ok' : 'bad') + '">' + ikon(s.lolos ? 'check_circle' : 'cancel') + '<div><b>' + esc(s.judul) + '</b><div class="small">' + esc(s.alasan) + '</div>' + (s.kunci === 'etle' && !s.lolos ? '<div class="tiny" style="margin-top:4px">Selesaikan kasus di modul ETLE (Admin ETLE) agar kartu dapat terbit.</div>' : '') + (s.kunci === 'kelengkapan' && !s.lolos ? '<a class="btn btn-outline btn-sm" style="margin-top:6px" href="#/cek?id=' + k.id + '">Periksa ulang</a>' : '') + '</div></div>'; }).join('') + '</div></div>' +
          '<form class="card card-b stack" id="fTtd"><h3>' + ikon('draw') + 'Penandatangan</h3>' + UI.Form.bangun([{ k: 'jabatan', l: 'Jabatan', full: true, ph: 'Kepala Bidang Sarana Transportasi' }, { k: 'nama', l: 'Nama pejabat', full: true }, { k: 'nip', l: 'NIP', mono: true, full: true }], T) +
          '<div class="hint">Diingat 10 menit untuk pencetakan berikutnya.</div></form>' +
          '<div class="card card-b stack"><button class="btn btn-primary btn-block" id="cA5"' + (d.bolehTerbit ? '' : ' disabled') + '>' + ikon('print') + 'Cetak A5 lanskap</button><button class="btn btn-amber btn-block" id="cA4"' + (d.bolehTerbit ? '' : ' disabled') + '>' + ikon('print') + 'Cetak A4</button>' +
          (d.bolehTerbit ? '' : '<div class="small muted center">Tombol cetak terkunci sampai semua syarat lolos.</div>') + '<a class="btn btn-ghost btn-block" href="#/riwayat?id=' + k.id + '">' + ikon('history') + 'Riwayat kendaraan</a></div></div>' +
          '<div class="card"><div class="card-h"><h3>' + ikon('preview') + 'Pratinjau (A5 lanskap)</h3><span class="small mono muted">' + esc(d.nomor) + '</span></div><div class="kertas-wrap" id="prev" style="' + (d.bolehTerbit ? '' : 'filter:grayscale(1);opacity:.55') + '"></div></div></div>';
        if (window.innerWidth < 1200) $('#gridK').style.gridTemplateColumns = 'minmax(0,1fr)';
        var f = $('#fTtd'), pratinjau = function () { T = UI.Form.data(f); $('#prev').innerHTML = kartuHtml(d, T, 'A5'); };
        f.addEventListener('input', App.debounce(pratinjau, 120)); pratinjau();
        var cetak = function (uk) {
          T = UI.Form.data(f); try { sessionStorage.setItem('ttd_kartu', JSON.stringify(T)); } catch (e) {}
          App.api('simau.ttd.simpan', T).catch(function () {});
          UI.Cetak.jalankan(kartuHtml(d, T, uk), uk === 'A4' ? 'A4' : 'A5 landscape');
        };
        $('#cA5').onclick = function () { cetak('A5'); }; $('#cA4').onclick = function () { cetak('A4'); };
      }, function (e) { $('#isiK').innerHTML = '<div class="card">' + galat(e) + '</div>'; });
    }
    siap(function () { pemilih($('#pil'), { idAwal: q.get('id'), onPilih: function (k) { history.replaceState(null, '', '#/kartu?id=' + k.id); tampil(k); } }); }).catch(function (e) { $('#pil').innerHTML = galat(e); });
  }

  // ================================================================== RIWAYAT
  function riwayat(el, args, q) {
    el.innerHTML = Shell.judul(el, { eyebrow: 'Pemeriksaan', h: 'Riwayat Kendaraan', p: 'Gabungan pemeriksaan, sanksi, izin insidentil, pengaduan, dan kasus ETLE untuk satu kendaraan.' }) +
      '<div class="card card-b" id="pil"></div><div id="isiR" style="margin-top:16px"></div>';
    var IK = { cek: 'fact_check', sanksi: 'gavel', insidentil: 'event_available', pengaduan: 'forum', etle: 'local_police' };
    function tampil(k) {
      $('#isiR').innerHTML = '<div class="card">' + UI.sk.baris(8) + '</div>';
      var hidup = Shell.hidup();
      App.swr('simau.riwayat', { id: k.id }, { maxAge: 0, onData: function (d) {
        if (!hidup()) return;
        var x = d.kendaraan;
        $('#isiR').innerHTML = '<div class="card card-b row wrap-row">' + App.plat(x.nopol, true).replace('plate', 'plate xl') + '<div class="grow"><b>' + esc(x.trayek || '-') + '</b><div class="small muted">' + esc(x.pemilik || '') + ' · ' + esc(x.perusahaan || '') + '</div></div>' + statusK(x) + '<a class="btn btn-outline btn-sm" href="#/kartu?id=' + x.id + '">' + ikon('badge') + 'Kartu</a></div>' +
          '<div class="card" style="margin-top:16px"><div class="card-h"><h3>' + d.peristiwa.length + ' peristiwa</h3></div><div class="card-b">' + (d.peristiwa.length ? '<div class="tl">' + d.peristiwa.map(function (e) {
            return '<div class="tl-i on"><span class="dot">' + ikon(IK[e.jenis] || 'circle') + '</span><div class="row between wrap-row"><b>' + esc(e.judul) + '</b><span class="small muted">' + fmt.tglJam(e.waktu) + '</span></div><div class="small muted">' + esc(e.ket || '') + '</div></div>';
          }).join('') + '</div>' : '<div class="kosong">' + ikon('history') + '<h4>Belum ada riwayat</h4></div>') + '</div></div>';
      } }).catch(function (e) { $('#isiR').innerHTML = '<div class="card">' + galat(e) + '</div>'; });
    }
    siap(function () { pemilih($('#pil'), { idAwal: q.get('id'), onPilih: function (k) { history.replaceState(null, '', '#/riwayat?id=' + k.id); tampil(k); } }); }).catch(function (e) { $('#pil').innerHTML = galat(e); });
  }

  // ================================================================== SANKSI
  function sanksi(el, args, q) {
    var adm = ADM.indexOf(me.role) > -1, tbl = null, hidup = Shell.hidup();
    el.innerHTML = Shell.judul(el, { eyebrow: 'Penindakan', h: 'Sanksi Administratif', p: 'Penghentian sementara, penghentian tetap, dan pencabutan izin memblokir penerbitan kartu selama aktif.', aksi: '<button class="btn btn-outline" id="ekspor">' + ikon('download') + 'Ekspor Excel</button><button class="btn btn-primary" id="tambah">' + ikon('add') + 'Catat Sanksi</button>' }) +
      '<div class="grid g4" id="kpi">' + UI.sk.kartu(3) + '</div><div class="card" id="t" style="margin-top:16px">' + UI.sk.baris(8) + '</div>';
    function muat(fresh) {
      return App.swr('simau.sanksi.list', {}, { maxAge: 30000, fresh: fresh, onData: function (d) {
        if (!hidup()) return;
        $('#kpi').innerHTML = stat('Sanksi aktif', d.filter(function (s) { return s.aktif; }).length, 'gavel') + stat('Pemblokir aktif', d.filter(function (s) { return s.aktif && s.blokir; }).length, 'lock', 'kartu tidak dapat terbit', 'var(--bad)') + stat('Selesai / dicabut', d.filter(function (s) { return s.status === 'Selesai'; }).length, 'task_alt') + stat('Total tercatat', d.length, 'list_alt');
        if (!tbl) tbl = UI.Tabel($('#t'), {
          cari: 'Cari nopol, jenis, alasan…', perHal: 15,
          saringHtml: '<select class="sel" data-saring="status" style="width:150px;height:38px"><option value="">Semua</option><option value="aktif">Aktif</option><option value="blokir">Pemblokir aktif</option><option value="Selesai">Selesai</option></select>',
          saring: function (r, k, v) { return v === 'aktif' ? r.aktif : v === 'blokir' ? r.aktif && r.blokir : r.status === v; },
          kolom: [{ k: 'nopol', l: 'Nopol', f: function (r) { return App.plat(r.nopol, true); } }, { k: 'jenis', l: 'Jenis sanksi', f: function (r) { return App.badge(r.jenis) + '<div class="tiny muted">' + esc(r.pasal || '') + '</div>'; } },
            { k: 'alasan', l: 'Alasan', f: function (r) { return '<span class="small">' + esc(String(r.alasan || '').slice(0, 90)) + '</span>' + (r.idPengaduan ? '<div class="tiny muted">dari pengaduan ' + esc(r.idPengaduan) + '</div>' : ''); } },
            { k: 'mulai', l: 'Periode', f: function (r) { return fmt.tgl(r.mulai) + ' – ' + (r.berakhir ? fmt.tgl(r.berakhir) : (r.permanen ? 'permanen' : 'sampai dicabut')); } },
            { k: 'status', l: 'Status', f: function (r) { return r.aktif ? App.badge('Aktif', 'b-bad') : App.badge(r.status === 'Aktif' ? 'Berakhir' : r.status, 'b-slate'); } },
            { l: '', cls: 'aksi', sort: false, f: function (r) { return (r.aktif ? '<button class="btn btn-outline btn-sm" data-aksi="selesai">Selesaikan</button>' : '') + (adm ? '<button class="btn btn-ghost btn-icon btn-sm" data-aksi="hapus" title="Hapus permanen" style="color:var(--bad)">' + ikon('delete') + '</button>' : ''); } }],
          data: d, onRow: lihat, onAksi: aksi, kosong: { ikon: 'gavel', judul: 'Belum ada sanksi' }
        }); else tbl.setData(d);
      } }).catch(function (e) { $('#t').innerHTML = galat(e); });
    }
    function lihat(r) {
      UI.Modal.buka({ judul: 'Sanksi ' + r.id, isi: '<div class="dl"><div><dt>Kendaraan</dt><dd>' + App.plat(r.nopol, true) + '</dd></div><div><dt>Jenis</dt><dd>' + esc(r.jenis) + (r.blokir ? ' <span class="badge b-crit">memblokir kartu</span>' : '') + '</dd></div><div><dt>Dasar</dt><dd>' + esc(r.pasal || '-') + '</dd></div>' +
        '<div><dt>Periode</dt><dd>' + fmt.tglP(r.mulai) + ' – ' + (r.berakhir ? fmt.tglP(r.berakhir) : '—') + '</dd></div><div><dt>Status</dt><dd>' + esc(r.status) + '</dd></div><div><dt>Petugas</dt><dd class="small">' + esc(r.petugas) + '<div class="tiny muted">' + fmt.tglJam(r.input) + '</div></dd></div></div>' +
        '<div class="lbl-f" style="margin-top:12px">Alasan</div><div class="card card-b" style="white-space:pre-line">' + esc(r.alasan) + '</div>' + (r.catatan ? '<div class="lbl-f" style="margin-top:12px">Catatan penyelesaian</div><div class="card card-b" style="white-space:pre-line">' + esc(r.catatan) + '</div>' : ''), tombol: [{ l: 'Tutup', cls: 'btn-primary' }] });
    }
    function aksi(a, r) {
      if (a === 'selesai') UI.Modal.konfirm('Selesaikan / cabut sanksi <b>' + esc(r.jenis) + '</b> untuk ' + esc(r.nopol) + '?', { judul: 'Selesaikan sanksi', ok: 'Selesaikan', alasan: 'Catatan penyelesaian' }).then(function (cat) {
        if (cat) App.api('simau.sanksi.selesai', { id: r.id, catatan: cat }).then(function () { App.toast('Sanksi diselesaikan.', 'ok'); muat(true); bump(); }, function (e) { App.toast(e.message, 'bad'); });
      });
      if (a === 'hapus') UI.Modal.konfirm('Hapus permanen sanksi ' + esc(r.id) + '? Gunakan hanya untuk data yang salah input; untuk sanksi yang berakhir gunakan <b>Selesaikan</b>.', { ok: 'Hapus permanen', bahaya: true, ketik: 'HAPUS' }).then(function (ok) {
        if (ok) App.api('simau.sanksi.hapus', { id: r.id }).then(function () { App.toast('Sanksi dihapus.', 'ok'); muat(true); bump(); }, function (e) { App.toast(e.message, 'bad'); });
      });
    }
    function form(pra) {
      pra = pra || {}; var pilihK = null;
      UI.Modal.buka({
        judul: 'Catat sanksi', lebar: 'lebar',
        isi: '<form id="fS" class="stack"><div id="pilS"></div>' + (pra.adu ? '<div class="note">' + ikon('forum') + '<div class="small">Sanksi ini menindaklanjuti pengaduan <b>' + esc(pra.adu) + '</b>; pengaduan otomatis ditandai Selesai.</div></div>' : '') +
          UI.Form.bangun([{ k: 'jenis', l: 'Jenis sanksi', t: 'select', wajib: true, full: true, opsi: B.jenisSanksi.map(function (j) { return { v: j.nama, l: j.nama + (j.blokir ? ' — memblokir kartu' : '') }; }) },
            { k: 'pasal', l: 'Dasar pasal', ph: 'otomatis sesuai jenis' }, { k: 'mulai', l: 'Tanggal mulai', t: 'date', wajib: true, awal: fmt.hariIni() }, { k: 'berakhir', l: 'Tanggal berakhir', t: 'date', hint: 'Kosongkan bila berlaku sampai dicabut.' },
            { k: 'alasan', l: 'Alasan / temuan', t: 'textarea', wajib: true, rows: 4 }], { alasan: pra.alasan || '', jenis: B.jenisSanksi[0].nama }) + '</form>',
        onBuka: function (p) {
          pemilih($('#pilS', p), { idAwal: pra.id, onPilih: function (k) { pilihK = k; } });
          if (pra.nopol && !pra.id) { var inp = $('#pilS input', p); inp.value = pra.nopol; inp.dispatchEvent(new Event('change')); }
          var f = $('#fS', p), j = function () { var x = B.jenisSanksi.filter(function (y) { return y.nama === f.jenis.value; })[0]; f.pasal.placeholder = x ? x.pasal : ''; };
          f.jenis.onchange = j; j();
        },
        tombol: [{ l: 'Batal' }, { l: 'Simpan sanksi', cls: 'btn-primary', aksi: function (b, p) {
          var f = $('#fS', p); if (!pilihK) { App.toast('Pilih kendaraan yang terdaftar.', 'warn'); return false; } if (!UI.Form.wajib(f)) return false;
          var d = UI.Form.data(f); d.idKendaraan = pilihK.id; if (pra.adu) d.idPengaduan = pra.adu;
          return App.api('simau.sanksi.simpan', d).then(function (r) { App.toast(r && r.id ? 'Sanksi dicatat.' : 'Tersimpan.', 'ok'); muat(true); bump(); if (pra.adu) App.swr('aduan.list', {}, { fresh: true }).catch(function () {}); });
        } }]
      });
    }
    $('#tambah').onclick = function () { form(); };
    $('#ekspor').onclick = function () {
      App.Xlsx.unduh('Sanksi-SIMAU-' + fmt.hariIni(), [{ nama: 'Sanksi', kolom: ['ID', 'Nomor Polisi', 'Jenis', 'Pasal', 'Alasan', 'Mulai', 'Berakhir', 'Status', 'Memblokir', 'Petugas', 'Catatan'], baris: (tbl ? tbl.tersaring() : []).map(function (r) { return [r.id, r.nopol, r.jenis, r.pasal, r.alasan, r.mulai, r.berakhir, r.aktif ? 'Aktif' : r.status, r.blokir ? 'YA' : 'TIDAK', r.petugas, r.catatan]; }) }]);
    };
    muat();
    siap(function () {
      if (q.get('nopol') || q.get('id')) { form({ nopol: q.get('nopol'), id: q.get('id'), adu: q.get('adu'), alasan: q.get('alasan') }); history.replaceState(null, '', '#/sanksi'); }
    }).catch(function () {});
  }

  // ================================================================== IZIN INSIDENTIL
  function insidentil(el, args, q) {
    var tbl = null, hidup = Shell.hidup();
    el.innerHTML = Shell.judul(el, { eyebrow: 'Penindakan', h: 'Izin Insidentil', p: 'Izin melayani di luar trayek paling lama <b>14 hari</b> dan tidak dapat diperpanjang (buat izin baru bila perlu).', aksi: '<button class="btn btn-primary" id="tambah">' + ikon('add') + 'Catat Izin</button>' }) +
      '<div class="card" id="t">' + UI.sk.baris(8) + '</div>';
    function muat(fresh) {
      return App.swr('simau.ins.list', {}, { maxAge: 30000, fresh: fresh, onData: function (d) {
        if (!hidup()) return;
        if (!tbl) tbl = UI.Tabel($('#t'), { cari: 'Cari nopol atau tujuan…', perHal: 15, data: d,
          saringHtml: '<select class="sel" data-saring="aktif" style="width:150px;height:38px"><option value="">Semua</option><option value="1">Sedang berlaku</option></select>', saring: function (r) { return r.aktif; },
          kolom: [{ k: 'nopol', l: 'Nopol', f: function (r) { return App.plat(r.nopol, true); } }, { k: 'asal', l: 'Trayek asal', f: function (r) { return '<span class="small">' + esc(r.asal) + '</span>'; } }, { k: 'tujuan', l: 'Tujuan insidentil' },
            { k: 'mulai', l: 'Periode', f: function (r) { var n = Math.round((new Date(r.berakhir) - new Date(r.mulai)) / 864e5) + 1; return fmt.tgl(r.mulai) + ' – ' + fmt.tgl(r.berakhir) + '<div class="tiny muted">' + n + ' hari</div>'; } },
            { k: 'aktif', l: 'Status', f: function (r) { return r.aktif ? App.badge('Berlaku', 'b-ok') : App.badge(r.mulai > fmt.hariIni() ? 'Akan datang' : 'Berakhir', 'b-slate'); } },
            { l: '', cls: 'aksi', sort: false, f: function () { return '<button class="btn btn-ghost btn-icon btn-sm" data-aksi="hapus" title="Hapus" style="color:var(--bad)">' + ikon('delete') + '</button>'; } }],
          onRow: form, onAksi: function (a, r) { if (a === 'hapus') UI.Modal.konfirm('Hapus izin insidentil ' + esc(r.nopol) + '?', { ok: 'Hapus', bahaya: true }).then(function (ok) { if (ok) App.api('simau.ins.hapus', { id: r.id }).then(function () { App.toast('Dihapus.', 'ok'); muat(true); }, function (e) { App.toast(e.message, 'bad'); }); }); },
          kosong: { ikon: 'event_available', judul: 'Belum ada izin insidentil' } });
        else tbl.setData(d);
      } }).catch(function (e) { $('#t').innerHTML = galat(e); });
    }
    function form(r, idAwal) {
      var baru = !r || !r.id; r = r && r.id ? r : {}; var pilihK = baru ? null : cariK(r.idKendaraan) || { id: r.idKendaraan };
      UI.Modal.buka({ judul: baru ? 'Catat izin insidentil' : 'Ubah izin ' + r.nopol,
        isi: '<form id="fI" class="stack">' + (baru ? '<div id="pilI"></div>' : '<div>' + App.plat(r.nopol, true) + '</div>') + UI.Form.bangun([{ k: 'tujuan', l: 'Tujuan insidentil', wajib: true, full: true, maks: 300 }, { k: 'mulai', l: 'Mulai', t: 'date', wajib: true, awal: fmt.hariIni() }, { k: 'berakhir', l: 'Berakhir', t: 'date', wajib: true }], r) +
          '<div id="lama" class="small"></div>' + (baru ? '' : '<div class="note warn">' + ikon('info') + '<div class="small">Tanggal berakhir tidak boleh melewati ' + fmt.tglP(r.berakhir) + ' (tidak dapat diperpanjang).</div></div>') + '</form>',
        onBuka: function (p) {
          if (baru) pemilih($('#pilI', p), { idAwal: idAwal, onPilih: function (k) { pilihK = k; } });
          var f = $('#fI', p), hit = function () { var n = f.mulai.value && f.berakhir.value ? Math.round((new Date(f.berakhir.value) - new Date(f.mulai.value)) / 864e5) + 1 : 0; $('#lama', p).innerHTML = n ? '<b style="color:' + (n > B.maksInsidentil || n < 1 ? 'var(--bad-tx)' : 'var(--ok-tx)') + '">' + n + ' hari</b> (maks. ' + B.maksInsidentil + ')' : ''; };
          f.mulai.oninput = f.berakhir.oninput = hit; if (!f.berakhir.value && baru) { var x = new Date(f.mulai.value); x.setDate(x.getDate() + 13); f.berakhir.value = x.toISOString().slice(0, 10); } hit();
        },
        tombol: [{ l: 'Batal' }, { l: 'Simpan', cls: 'btn-primary', aksi: function (b, p) {
          var f = $('#fI', p); if (!pilihK) { App.toast('Pilih kendaraan yang terdaftar.', 'warn'); return false; } if (!UI.Form.wajib(f)) return false;
          var d = UI.Form.data(f); d.idKendaraan = pilihK.id; if (!baru) d.id = r.id;
          return App.api('simau.ins.simpan', d).then(function () { App.toast('Izin tersimpan.', 'ok'); muat(true); });
        } }] });
    }
    $('#tambah').onclick = function () { form(null); };
    muat();
    siap(function () { if (q.get('id')) { form(null, q.get('id')); history.replaceState(null, '', '#/insidentil'); } }).catch(function () {});
  }

  // ================================================================== FASILITAS HALTE + PETA
  function halte(el) {
    var tbl = null, peta = null, lapis = null, data = [], hidup = Shell.hidup();
    el.innerHTML = Shell.judul(el, { eyebrow: 'Fasilitas', h: 'Fasilitas Halte', p: 'Inventaris 10 fasilitas per halte beserta lokasi. Peta memakai OpenStreetMap dan dimuat saat dibutuhkan.', aksi: '<button class="btn btn-primary" id="tambah">' + ikon('add') + 'Tambah Halte</button>' }) +
      '<div class="grid g2" style="align-items:start"><div class="card" id="t">' + UI.sk.baris(8) + '</div><div class="card"><div id="peta" style="height:460px;border-radius:var(--r-lg);background:var(--bg);display:grid;place-items:center" class="muted small">Memuat peta…</div></div></div>';
    function gambarPeta() {
      UI.Peta.buat($('#peta'), -1.2420, 116.8940, 12).then(function (m) {
        if (!hidup()) { m.remove(); return; }
        peta = m; lapis = window.L.layerGroup().addTo(m); tandai();
      }, function (e) { $('#peta').textContent = e.message; });
    }
    function tandai() {
      if (!peta) return; lapis.clearLayers(); var b = [];
      data.forEach(function (h) { var la = parseFloat(h.lat), lo = parseFloat(h.lng); if (isNaN(la) || isNaN(lo)) return; b.push([la, lo]); window.L.marker([la, lo]).addTo(lapis).bindPopup('<b>' + esc(h.nama) + '</b><br>' + h.baik + '/' + B.fasilitas.length + ' fasilitas baik'); });
      if (b.length) peta.fitBounds(b, { padding: [30, 30], maxZoom: 15 });
    }
    function muat(fresh) {
      return App.swr('simau.halte.list', {}, { maxAge: 30000, fresh: fresh, onData: function (d) {
        data = d; if (!hidup()) return;
        if (!tbl) tbl = UI.Tabel($('#t'), { cari: 'Cari nama halte…', perHal: 10, data: d,
          kolom: [{ k: 'nama', l: 'Halte', f: function (r) { return '<div class="row">' + (r.foto ? '<img src="' + esc(r.foto) + '" alt="" referrerpolicy="no-referrer" style="width:44px;height:44px;border-radius:8px;object-fit:cover">' : '') + '<div><b>' + esc(r.nama) + '</b><div class="tiny muted mono">' + esc(r.lat && r.lng ? r.lat + ', ' + r.lng : 'tanpa koordinat') + '</div></div></div>'; } },
            { k: 'baik', l: 'Fasilitas baik', cls: 'right', f: function (r) { return '<b class="mono">' + r.baik + '/' + B.fasilitas.length + '</b><div class="tiny muted">' + r.ada + ' ada</div>'; } },
            { l: '', cls: 'aksi', sort: false, f: function () { return '<button class="btn btn-ghost btn-icon btn-sm" data-aksi="hapus" title="Hapus" style="color:var(--bad)">' + ikon('delete') + '</button>'; } }],
          onRow: form, onAksi: function (a, r) { if (a === 'hapus') UI.Modal.konfirm('Hapus halte ' + esc(r.nama) + '?', { ok: 'Hapus', bahaya: true }).then(function (ok) { if (ok) App.api('simau.halte.hapus', { id: r.id }).then(function () { App.toast('Dihapus.', 'ok'); muat(true); }, function (e) { App.toast(e.message, 'bad'); }); }); },
          kosong: { ikon: 'signpost', judul: 'Belum ada halte' } });
        else tbl.setData(d);
        tandai();
      } }).catch(function (e) { $('#t').innerHTML = galat(e); });
    }
    function form(r) {
      var baru = !r; r = r || { item: {} }; var fotoBaru = '';
      UI.Modal.buka({ judul: baru ? 'Tambah halte' : 'Ubah ' + r.nama, lebar: 'lebar',
        isi: '<form id="fH" class="stack">' + UI.Form.bangun([{ k: 'nama', l: 'Nama halte', wajib: true, full: true, maks: 150 }, { k: 'lat', l: 'Lintang (latitude)', mono: true, ph: '-1.2735' }, { k: 'lng', l: 'Bujur (longitude)', mono: true, ph: '116.8467' }], r) +
          '<div class="row wrap-row"><button type="button" class="btn btn-outline btn-sm" id="gps">' + ikon('my_location') + 'Pakai lokasi saya</button><label class="btn btn-outline btn-sm">' + ikon('photo_camera') + '<span>Foto halte</span><input type="file" accept="image/*" capture="environment" hidden id="fotoH"></label>' +
          '<img id="prevH" src="' + esc(r.foto || '') + '" alt="" referrerpolicy="no-referrer" style="width:64px;height:64px;object-fit:cover;border-radius:8px;' + (r.foto ? '' : 'display:none') + '"></div>' +
          '<div class="lbl-f">10 fasilitas</div><div class="card">' + B.fasilitas.map(function (f) {
            var v = r.item[f.k] || [];
            return '<div class="row wrap-row" style="padding:10px 14px;border-bottom:1px solid var(--line)"><b class="small grow" style="min-width:160px">' + esc(f.l) + '</b><div class="seg ok"><label><input type="radio" name="' + f.k + '_k" value="Ada"' + (v[0] === 'Ada' ? ' checked' : '') + '>Ada</label><label><input type="radio" name="' + f.k + '_k" value="Tidak"' + (v[0] === 'Tidak' ? ' checked' : '') + '>Tidak</label></div>' +
              '<div class="seg ok"><label><input type="radio" name="' + f.k + '_c" value="Baik"' + (v[1] === 'Baik' ? ' checked' : '') + '>Baik</label><label><input type="radio" name="' + f.k + '_c" value="Buruk"' + (v[1] === 'Buruk' ? ' checked' : '') + '>Buruk</label></div></div>';
          }).join('') + '</div></form>',
        onBuka: function (p) {
          var f = $('#fH', p);
          $('#gps', p).onclick = function () {
            if (!navigator.geolocation) return App.toast('Perangkat tidak mendukung lokasi.', 'warn');
            var b = this; b.classList.add('loading');
            navigator.geolocation.getCurrentPosition(function (pos) { b.classList.remove('loading'); f.lat.value = pos.coords.latitude.toFixed(6); f.lng.value = pos.coords.longitude.toFixed(6); App.toast('Akurasi ± ' + Math.round(pos.coords.accuracy) + ' m', 'ok'); },
              function (e) { b.classList.remove('loading'); App.toast('Lokasi tidak didapat: ' + e.message, 'bad'); }, { enableHighAccuracy: true, timeout: 15000 });
          };
          $('#fotoH', p).onchange = function () { var file = this.files[0]; if (!file) return; App.kompres(file, 1280, 300).then(function (u) { fotoBaru = u; $('#prevH', p).src = u; $('#prevH', p).style.display = ''; }, function (e) { App.toast(e.message, 'bad'); }); };
        },
        tombol: [{ l: 'Batal' }, { l: 'Simpan', cls: 'btn-primary', aksi: function (b, p) {
          var f = $('#fH', p); if (!UI.Form.wajib(f)) return false;
          var row = { nama: f.nama.value, lat: f.lat.value, lng: f.lng.value, foto: r.foto || '', item: {} };
          if (!baru) row.id = r.id; if (fotoBaru) row.fotoBaru = fotoBaru;
          B.fasilitas.forEach(function (x) { var a = f[x.k + '_k'].value; row.item[x.k] = [a, a === 'Ada' ? f[x.k + '_c'].value : '']; });
          return App.api('simau.halte.simpan', { row: row }).then(function () { App.toast('Halte tersimpan.', 'ok'); muat(true); });
        } }] });
    }
    $('#tambah').onclick = function () { form(null); };
    boot(function () {}).then(function () { muat(); gambarPeta(); }, function (e) { $('#t').innerHTML = galat(e); });
    return function () { if (peta) { peta.remove(); peta = null; } };
  }

  // ================================================================== LAPORAN (7 jenis, siap cetak + Excel)
  function laporan(el, args, q) {
    var J = [['harian', 'Harian per trayek'], ['bulanan', 'Bulanan per trayek'], ['cek', 'Kelengkapan'], ['halte', 'Fasilitas halte'], ['pengaduan', 'Pengaduan'], ['insidentil', 'Izin insidentil'], ['peremajaan', 'Peremajaan']];
    var jenis = J.some(function (j) { return j[0] === q.get('j'); }) ? q.get('j') : 'harian';
    var hariIni = fmt.hariIni(), awalBulan = hariIni.slice(0, 8) + '01';
    var PARAM = {
      harian: [{ k: 'tanggal', l: 'Per tanggal', t: 'date', awal: hariIni }],
      bulanan: [{ k: 'bulan', l: 'Bulan', t: 'select', opsi: fmt.BLN_P.map(function (b, i) { return { v: String(i + 1), l: b }; }), awal: String(Number(hariIni.slice(5, 7))) }, { k: 'tahun', l: 'Tahun', t: 'number', awal: hariIni.slice(0, 4), min: 2015, max: 2100 }],
      pengaduan: [{ k: 'dari', l: 'Dari', t: 'date', awal: awalBulan }, { k: 'sampai', l: 'Sampai', t: 'date', awal: hariIni }],
      insidentil: [{ k: 'dari', l: 'Dari', t: 'date', awal: awalBulan }, { k: 'sampai', l: 'Sampai', t: 'date', awal: hariIni }]
    };
    el.innerHTML = Shell.judul(el, { eyebrow: 'Laporan', h: 'Laporan & Cetak', p: 'Angka dihitung langsung dari data saat ini (bukan salinan). Laporan kelengkapan memakai aturan Ada DAN Baik yang sama dengan kartu.' }) +
      '<div class="tabs" style="margin-bottom:16px">' + J.map(function (j) { return '<a href="#/laporan?j=' + j[0] + '" class="' + (j[0] === jenis ? 'on' : '') + '">' + j[1] + '</a>'; }).join('') + '</div>' +
      '<form class="card card-b row wrap-row" id="fL" style="align-items:flex-end">' + (PARAM[jenis] ? '<div class="grow">' + UI.Form.bangun(PARAM[jenis], {}) + '</div>' : '<div class="grow small muted">Laporan ini tidak memerlukan parameter.</div>') +
      '<button class="btn btn-primary">' + ikon('table_view') + 'Tampilkan</button><button type="button" class="btn btn-outline" id="xl" disabled>' + ikon('download') + 'Excel</button><button type="button" class="btn btn-amber" id="cetakL" disabled>' + ikon('print') + 'Cetak A4</button></form>' +
      '<div class="kertas-wrap" id="hasil" style="margin-top:16px"><div class="kosong">' + ikon('summarize') + '<h4>Pilih parameter lalu Tampilkan</h4></div></div>';
    var terakhir = null;
    function tabel(kolom, baris, kaki) { return '<table class="tgrid"><thead><tr>' + kolom.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' + (baris.length ? baris.map(function (r) { return '<tr>' + r.map(function (v) { return '<td>' + esc(v === null || v === undefined ? '' : v) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + kolom.length + '" style="text-align:center">Tidak ada data.</td></tr>') + '</tbody>' + (kaki ? '<tfoot><tr>' + kaki.map(function (v) { return '<th>' + esc(v) + '</th>'; }).join('') + '</tr></tfoot>' : '') + '</table>'; }
    function susun(d, p) {
      var judul, sub = '', kolom, baris, kaki = null, tambahan = '';
      if (jenis === 'harian' || jenis === 'bulanan') {
        judul = jenis === 'harian' ? 'LAPORAN HARIAN KENDARAAN ANGKUTAN KOTA' : 'LAPORAN BULANAN KENDARAAN ANGKUTAN KOTA';
        sub = jenis === 'harian' ? 'Per tanggal ' + fmt.tglP(d.tanggal) : 'Bulan ' + fmt.BLN_P[d.bulan - 1] + ' ' + d.tahun + ' (keadaan per ' + fmt.tglP(d.perTanggal) + ')';
        kolom = ['No', 'Kode', 'Trayek', 'Jumlah', 'Aktif', 'Tidak Aktif']; baris = d.baris.map(function (r, i) { return [i + 1, r.kode, r.nama, r.total, r.aktif, r.tidakAktif]; }); kaki = ['', '', 'JUMLAH', d.jumlah.total, d.jumlah.aktif, d.jumlah.tidakAktif];
      } else if (jenis === 'cek') {
        judul = 'LAPORAN KELENGKAPAN KENDARAAN ANGKUTAN KOTA'; sub = 'Pemeriksaan terakhir tiap kendaraan · ambang ' + d.ambang + '% (Ada DAN Baik)';
        kolom = ['No', 'No. Checklist', 'Nomor Polisi', 'Trayek', 'Cek Terakhir', 'Jml Cek', 'Kelengkapan', 'Hasil', 'Petugas']; baris = d.baris.map(function (r, i) { return [i + 1, r.idCek || '-', r.nopol, r.trayek, r.tanggal || 'belum dicek', r.jumlah || '-', r.persen === null ? '-' : r.persen + '%', r.persen === null ? '-' : r.lolos ? 'Memenuhi' : 'Tidak memenuhi', r.petugas]; });
        tambahan = '<h4 style="margin:14px 0 6px;font-size:13px">Rekap per komponen</h4>' + tabel(['Komponen', 'Diperiksa', 'Ada', 'Ada & Baik', '% Ada & Baik'], d.perItem.map(function (x) { return [x.l, x.diperiksa, x.ada, x.adaBaik, x.diperiksa ? Math.round(x.adaBaik / x.diperiksa * 100) + '%' : '-']; }));
      } else if (jenis === 'halte') {
        judul = 'LAPORAN FASILITAS HALTE'; kolom = ['No', 'Halte'].concat(d.fasilitas.map(function (f) { return f.l; })).concat(['Baik']);
        baris = d.baris.map(function (h, i) { return [i + 1, h.nama].concat(d.fasilitas.map(function (f) { var v = h.item[f.k] || []; return v[0] === 'Ada' ? (v[1] === 'Baik' ? 'Baik' : v[1] === 'Buruk' ? 'Buruk' : 'Ada') : v[0] === 'Tidak' ? 'Tidak' : '-'; })).concat([h.baik + '/' + d.fasilitas.length]); });
      } else if (jenis === 'pengaduan') {
        judul = 'LAPORAN PENGADUAN MASYARAKAT'; sub = 'Periode ' + fmt.tglP(d.dari) + ' s.d. ' + fmt.tglP(d.sampai);
        kolom = ['No', 'Kode Tiket', 'Tanggal', 'Jenis', 'Nopol', 'Lokasi', 'Status']; baris = d.baris.map(function (r, i) { return [i + 1, r.kode, r.tanggal, r.jenis, r.nopol, r.lokasi, r.status]; });
        tambahan = '<p style="font-size:12px;margin-top:10px">Rekap status: ' + Object.keys(d.perStatus).map(function (k) { return esc(k) + ' ' + d.perStatus[k]; }).join(' · ') + '</p>';
      } else if (jenis === 'insidentil') {
        judul = 'LAPORAN IZIN INSIDENTIL'; sub = 'Periode ' + fmt.tglP(d.dari) + ' s.d. ' + fmt.tglP(d.sampai);
        kolom = ['No', 'Nomor Polisi', 'Trayek Asal', 'Tujuan', 'Mulai', 'Berakhir']; baris = d.baris.map(function (r, i) { return [i + 1, r.nopol, r.asal, r.tujuan, r.mulai, r.berakhir]; });
      } else {
        judul = 'LAPORAN KENDARAAN WAJIB PEREMAJAAN'; sub = 'Usia kendaraan lebih dari ' + d.batas + ' tahun';
        kolom = ['No', 'Nomor Polisi', 'Trayek', 'Pemilik', 'Tahun', 'Usia', 'Status']; baris = d.baris.map(function (r, i) { return [i + 1, r.nopol, r.trayek, r.pemilik, r.tahun, r.usia + ' th', r.status]; });
      }
      var html = '<div class="kertas a4">' + kopHtml(d.kop) + '<h2>' + judul + '</h2><div class="no">' + esc(sub) + '</div>' + tabel(kolom, baris, kaki) + tambahan +
        '<div class="ttd"><div></div><div class="k">Balikpapan, ' + fmt.tglP(fmt.hariIni()) + '<br>Kepala Bidang Sarana Transportasi<div class="sp"></div><b>(.................................)</b></div></div><div class="tiny" style="margin-top:12px;color:#64748B">Dicetak dari SIMAU oleh ' + esc(me.email) + ' · ' + fmt.tglJam(new Date().toISOString()) + '</div></div>';
      return { html: html, judul: judul, kolom: kolom, baris: baris.concat(kaki ? [kaki] : []) };
    }
    $('#fL').onsubmit = function (e) {
      e.preventDefault(); var p = UI.Form.data(this);
      $('#hasil').innerHTML = '<div class="card">' + UI.sk.baris(10) + '</div>';
      UI.Form.muat(this.querySelector('.btn-primary'), App.api('lap.' + jenis, p)).then(function (d) {
        terakhir = susun(d, p); $('#hasil').innerHTML = terakhir.html; $('#xl').disabled = false; $('#cetakL').disabled = false;
      }, function (er) { $('#hasil').innerHTML = '<div class="card">' + galat(er) + '</div>'; });
    };
    $('#xl').onclick = function () { if (terakhir) App.Xlsx.unduh('Laporan-' + jenis + '-' + fmt.hariIni(), [{ nama: jenis, kolom: terakhir.kolom, baris: terakhir.baris }]); };
    $('#cetakL').onclick = function () { if (terakhir) UI.Cetak.jalankan(terakhir.html, jenis === 'halte' ? 'A4 landscape' : 'A4'); };
    if (!PARAM[jenis]) $('#fL').requestSubmit ? $('#fL').requestSubmit() : $('#fL').onsubmit(new Event('submit'));
  }

  // ================================================================== MULAI
  Shell.mulai({
    modul: 'simau', judul: 'SIMAU DISHUB', sub: 'Kota Balikpapan', judulPendek: 'SIMAU', peran: ['Superadmin', 'Admin Angkutan', 'Petugas Angkutan'], awal: 'dashboard',
    cari: { ph: 'Cari nomor polisi, pemilik, trayek…', onCari: function (v) { location.hash = '#/kendaraan?q=' + encodeURIComponent(v); } },
    menu: [
      { grp: 'Ringkasan', item: [{ h: '#/dashboard', l: 'Dashboard', i: 'dashboard' }] },
      { grp: 'Data Induk', item: [{ h: '#/trayek', l: 'Trayek', i: 'route' }, { h: '#/perusahaan', l: 'Perusahaan', i: 'apartment' }, { h: '#/kendaraan', l: 'Data Kendaraan', i: 'directions_bus' }] },
      { grp: 'Pemeriksaan', item: [{ h: '#/cek', l: 'Cek Kelengkapan', i: 'fact_check' }, { h: '#/kartu', l: 'Kartu Pengawasan', i: 'badge' }, { h: '#/riwayat', l: 'Riwayat Kendaraan', i: 'history' }] },
      { grp: 'Penindakan', item: [{ h: '#/sanksi', l: 'Sanksi', i: 'gavel' }, { h: '#/insidentil', l: 'Izin Insidentil', i: 'event_available' }] },
      { grp: 'Fasilitas', item: [{ h: '#/halte', l: 'Fasilitas Halte', i: 'signpost' }] },
      { grp: 'Layanan', item: [{ h: '#/pengaduan', l: 'Data Pengaduan', i: 'forum', badge: 'aduan' }] },
      { grp: 'Laporan', item: [{ h: '#/laporan', l: 'Laporan & Cetak', i: 'print' }] },
      { grp: 'Pengaturan', item: [{ h: '#/akun', l: 'Kelola Akun', i: 'manage_accounts', peran: ADM }, { h: '#/sistem', l: 'Sistem & Keamanan', i: 'shield', peran: SA }, { h: '#/impor', l: 'Migrasi Data', i: 'sync_alt', peran: SA }] }
    ],
    rute: {
      dashboard: dashboard, trayek: master('trayek'), perusahaan: master('perusahaan'), kendaraan: kendaraan, cek: cek, kartu: kartu, riwayat: riwayat,
      sanksi: sanksi, insidentil: insidentil, halte: halte, laporan: laporan,
      pengaduan: function (el, a, q) { Shell.halAduan(el, a, q, { bisaSanksi: true, onJumlah: function (n) { Shell.badgeMenu('aduan', n); } }); },
      akun: Shell.halAkun, sistem: Shell.halSistem, impor: Shell.halImpor
    },
    prefetch: function () {
      ['simau.dashboard', 'simau.cek.list', 'simau.sanksi.list', 'simau.ins.list', 'simau.halte.list', 'aduan.list'].forEach(function (a) { App.swr(a, {}, { maxAge: 30000 }).catch(function () {}); });
    }
  });
  boot(function (d) { Shell.badgeMenu('aduan', d.aduanBaru); }).catch(function () {});
  knd().catch(function () {});
  App.daftarSW('sw.js');
})();
