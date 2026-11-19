/**
 * shell.js — kerangka panel admin (sidebar navy + topbar), router hash, penjaga peran,
 * pengalih modul (Konten / SIMAU / ETLE), menu akun (versi app vs server), dan halaman bersama:
 * Kelola Akun (whitelist), Data Pengaduan, Sistem & Keamanan, Migrasi Data.
 */
(function () {
  'use strict';
  var esc = App.esc, ikon = App.ikon, fmt = App.fmt, $ = App.$, $$ = App.$$;
  var MODUL = {
    konten: { l: 'Konten', h: 'konten/', peran: ['Superadmin', 'Admin Konten'] },
    simau: { l: 'SIMAU', h: 'simau/', peran: ['Superadmin', 'Admin Angkutan', 'Petugas Angkutan'] },
    etle: { l: 'ETLE', h: 'etle/', peran: ['Superadmin', 'Admin ETLE', 'Petugas Lapangan'] }
  };
  var S = { cfg: null, el: null, cleanup: null, rute: '', gen: 0 };
  /** hidup() → fungsi yang bernilai true selama halaman yang sama masih tampil (penjaga callback async). */
  function hidup() { var g = S.gen; return function () { return S.gen === g; }; }

  function inisial(n) { return String(n || '?').split(/[\s@.]+/).filter(String).slice(0, 2).map(function (x) { return x[0].toUpperCase(); }).join(''); }
  function bolehModul(m, role) { return MODUL[m].peran.indexOf(role) > -1; }

  function mulai(cfg) {
    S.cfg = cfg;
    var sesi = App.Sesi.get();
    if (!sesi) { App.Sesi.habis('Silakan masuk untuk membuka ' + cfg.judul + '.'); return; }
    var me = sesi.me;
    if (cfg.peran.indexOf(me.role) === -1) {
      var ke = App.Sesi.ke(me.role);
      document.body.innerHTML = '<div class="wrap" style="max-width:520px;padding-top:80px"><div class="card card-b center stack">' + ikon('block') +
        '<h2>Tidak ada akses</h2><p class="muted">Peran Anda (' + esc(me.role) + ') tidak dapat membuka ' + esc(cfg.judul) + '.</p>' +
        (ke ? '<a class="btn btn-primary" href="' + App.ROOT + ke + '">Buka ruang kerja Anda</a>' : '') + ' <a class="btn btn-outline" href="' + App.ROOT + '">Ke Beranda</a></div></div>';
      return;
    }
    if (localStorage.getItem('tema') === 'gelap' && cfg.tema !== false) document.documentElement.dataset.tema = 'gelap';
    var modulHtml = Object.keys(MODUL).filter(function (m) { return bolehModul(m, me.role); }).map(function (m) {
      return '<a href="' + App.ROOT + MODUL[m].h + '" class="' + (m === cfg.modul ? 'on' : '') + '">' + MODUL[m].l + '</a>';
    }).join('');
    document.body.innerHTML =
      '<div class="app">' +
      '<aside class="side" id="side"><div class="logo"><div class="ic"><img src="' + App.ROOT + 'icons/logo.svg" alt=""></div><div><b>' + esc(cfg.judul) + '</b><small>' + esc(cfg.sub || 'Kota Balikpapan') + '</small></div></div>' +
      (modulHtml.split('</a>').length > 2 ? '<div class="modul" aria-label="Pindah modul">' + modulHtml + '</div>' : '') +
      '<nav id="nav"></nav><div class="kaki"><span>SISTEM DISHUB</span><span class="ver">v' + esc(App.VERSI) + '</span></div></aside>' +
      '<div class="main"><header class="topbar"><button class="btn btn-ghost btn-icon burger-adm" id="burger" aria-label="Menu">' + ikon('menu') + '</button>' +
      '<div class="crumb" id="crumb"></div>' +
      (cfg.cari ? '<div class="cari inp-ico">' + ikon('search') + '<input class="inp" id="cariGlobal" type="search" placeholder="' + esc(cfg.cari.ph) + '"></div>' : '<div class="grow"></div>') +
      '<span class="server">Server aktif</span>' +
      '<button class="who" id="who" aria-haspopup="true"><span><b>' + esc(me.nama || me.email) + '</b><small>' + esc(me.role) + '</small></span><span class="avatar">' + (me.foto ? '<img src="' + esc(me.foto) + '" alt="" referrerpolicy="no-referrer">' : esc(inisial(me.nama || me.email))) + '</span></button></header>' +
      '<div id="banner"></div><main class="konten" id="konten"></main></div></div>';
    S.el = $('#konten');
    $('#burger').onclick = function () { $('#side').classList.toggle('buka'); };
    $('#who').onclick = menuAkun;
    if (cfg.cari) $('#cariGlobal').addEventListener('keydown', function (e) { if (e.key === 'Enter' && this.value.trim()) cfg.cari.onCari(this.value.trim()); });
    gambarMenu();
    window.addEventListener('hashchange', jalan);
    document.addEventListener('versi-beda', function (e) {
      $('#banner').innerHTML = '<div class="konten" style="padding-bottom:0"><div class="note warn">' + ikon('warning') + '<div><b>Versi berbeda.</b> Aplikasi v' + esc(e.detail.app) + ', server v' + esc(e.detail.server) + '. Backend belum diperbarui (atau tekan Ctrl+Shift+R untuk memuat ulang aplikasi).</div></div></div>';
    });
    App.Sesi.pantau();
    App.warmUp('admin');
    jalan();
    if (cfg.prefetch) { if (window.requestIdleCallback) requestIdleCallback(function () { cfg.prefetch(); }, { timeout: 2500 }); else setTimeout(cfg.prefetch, 1200); }
  }

  function gambarMenu() {
    var me = App.Sesi.me();
    $('#nav').innerHTML = S.cfg.menu.map(function (g) {
      var items = g.item.filter(function (it) { return !it.peran || it.peran.indexOf(me.role) > -1; });
      if (!items.length) return '';
      return '<div class="grp">' + esc(g.grp) + '</div>' + items.map(function (it) {
        return '<a class="it" href="' + it.h + '" data-r="' + it.h.replace('#/', '').split('?')[0] + '">' + ikon(it.i) + '<span>' + esc(it.l) + '</span>' + (it.badge ? '<span class="n hide" data-badge="' + it.badge + '"></span>' : '') + '</a>';
      }).join('');
    }).join('');
  }
  function badgeMenu(kunci, n) { var b = $('[data-badge="' + kunci + '"]'); if (b) { b.textContent = n; b.classList.toggle('hide', !n); } }

  function urai() {
    var h = (location.hash || '').replace(/^#\/?/, ''), parts = h.split('?'), seg = parts[0].split('/').filter(String);
    return { nama: seg[0] || S.cfg.awal, args: seg.slice(1).map(decodeURIComponent), q: new URLSearchParams(parts[1] || '') };
  }

  function jalan() {
    var r = urai(), fn = S.cfg.rute[r.nama];
    var me = App.Sesi.me();
    var item = null;
    S.cfg.menu.forEach(function (g) { g.item.forEach(function (it) { if (it.h.replace('#/', '').split('?')[0] === r.nama) item = it; }); });
    if (item && item.peran && item.peran.indexOf(me.role) === -1) fn = null;
    $$('#nav .it').forEach(function (a) { a.classList.toggle('on', a.dataset.r === r.nama); });
    $('#crumb').innerHTML = esc(S.cfg.judulPendek || S.cfg.modul.toUpperCase()) + ' ' + ikon('chevron_right') + ' <b>' + esc(item ? item.l : (S.cfg.judulRute && S.cfg.judulRute[r.nama]) || '') + '</b>';
    $('#side').classList.remove('buka');
    if (typeof S.cleanup === 'function') { try { S.cleanup(); } catch (e) {} }
    S.cleanup = null; S.gen++; UI.tutupSemua();
    window.scrollTo(0, 0);
    if (!fn) { S.el.innerHTML = '<div class="kosong">' + ikon('travel_explore') + '<h4>Halaman tidak ditemukan</h4><a href="#/' + S.cfg.awal + '">Kembali</a></div>'; return; }
    S.rute = r.nama;
    try { S.cleanup = fn(S.el, r.args, r.q); }
    catch (e) { S.el.innerHTML = '<div class="note bad">' + ikon('error') + '<div>' + esc(e.message) + '</div></div>'; console.error(e); }
  }

  function menuAkun(e) {
    e.stopPropagation();
    var ada = $('.menu-akun'); if (ada) { ada.remove(); return; }
    var me = App.Sesi.me(), sisa = Math.max(0, Math.round(App.Sesi.sisaMs() / 60000));
    var m = document.createElement('div'); m.className = 'menu-akun';
    m.innerHTML = '<div class="kepala"><b>' + esc(me.nama || '') + '</b><div class="small muted">' + esc(me.email) + '</div><div style="margin-top:6px">' + App.badge(me.role, 'b-navy') + '</div>' +
      '<div class="tiny muted" style="margin-top:8px">Sesi berakhir dalam ' + Math.floor(sisa / 60) + ' jam ' + (sisa % 60) + ' menit</div></div>' +
      '<button data-a="versi">' + ikon('info') + 'Versi aplikasi ' + esc(App.VERSI) + (App.Versi.server ? ' · server ' + esc(App.Versi.server) : '') + '</button>' +
      (S.cfg.tema !== false ? '<button data-a="tema">' + ikon('dark_mode') + (document.documentElement.dataset.tema === 'gelap' ? 'Mode terang' : 'Mode gelap') + '</button>' : '') +
      (App.Pasang.evt ? '<button data-a="pasang">' + ikon('install_mobile') + 'Pasang sebagai aplikasi</button>' : '') +
      '<a href="' + App.ROOT + '" target="_blank" rel="noopener">' + ikon('public') + 'Situs publik</a>' +
      '<button data-a="keluar" style="color:var(--bad)">' + ikon('logout') + 'Keluar</button>';
    document.body.appendChild(m);
    var tutup = function () { m.remove(); document.removeEventListener('click', tutup); };
    setTimeout(function () { document.addEventListener('click', tutup); }, 0);
    m.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'keluar') keluar();
      if (a.dataset.a === 'tema') { var g = document.documentElement.dataset.tema === 'gelap'; if (g) delete document.documentElement.dataset.tema; else document.documentElement.dataset.tema = 'gelap'; localStorage.setItem('tema', g ? 'terang' : 'gelap'); }
      if (a.dataset.a === 'versi') riwayatVersi();
      if (a.dataset.a === 'pasang') App.Pasang.tampilkan().then(function (ok) { if (ok) App.toast('Aplikasi dipasang di perangkat.', 'ok'); });
    });
  }

  function riwayatVersi() {
    UI.Modal.buka({
      judul: 'Versi & riwayat', isi: '<div class="dl" style="margin-bottom:16px"><div><dt>Aplikasi</dt><dd class="mono">' + esc(App.VERSI) + '</dd></div><div><dt>Server</dt><dd class="mono">' + esc(App.Versi.server || 'belum terhubung') + '</dd></div></div>' +
        (App.Versi.server && App.Versi.server !== App.VERSI ? '<div class="note warn">' + ikon('warning') + '<div>Versi berbeda: backend belum diperbarui atau aplikasi perlu dimuat ulang.</div></div>' : '') +
        (window.RIWAYAT_VERSI || []).map(function (r) { return '<h4 style="margin-top:14px">v' + esc(r.v) + ' <span class="muted small">' + fmt.tgl(r.tgl) + '</span></h4><ul class="small">' + r.isi.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }).join(''),
      tombol: [{ l: 'Tutup', cls: 'btn-primary' }]
    });
  }

  function keluar() {
    var t = App.Sesi.token();
    App.api('auth.logout', { token: t }).catch(function () {}).then(function () {
      App.Sesi.hapus(); App.Simpan.bersihkan();
      try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
      location.href = App.ROOT;
    });
  }

  function judul(el, o) {
    return '<div class="ph"><div><div class="eyebrow">' + esc(o.eyebrow || '') + '</div><h1>' + esc(o.h) + '</h1>' + (o.p ? '<p>' + o.p + '</p>' : '') + '</div><div class="aksi">' + (o.aksi || '') + '</div></div>';
  }

  // ================================================================== HALAMAN BERSAMA: KELOLA AKUN
  function halAkun(el) {
    el.innerHTML = judul(el, { eyebrow: 'Pengaturan', h: 'Kelola Akun', p: 'Daftar email Google yang boleh masuk (whitelist). Akses dicek pada setiap permintaan; menonaktifkan akun berlaku seketika.', aksi: '<button class="btn btn-primary" id="tambah">' + ikon('person_add') + 'Tambah Akun</button>' }) +
      '<div class="card" id="tbl">' + UI.sk.baris(6) + '</div><div class="note" style="margin-top:16px">' + ikon('verified_user') + '<div>Pengguna masuk dengan akun Google pribadinya. Sistem tidak menyimpan kata sandi. Anjurkan verifikasi dua langkah pada akun Google, terutama untuk admin.</div></div>';
    var me = App.Sesi.me(), boleh = [], tbl = null, h = hidup();
    function muat(fresh) {
      return App.swr('akun.list', {}, { maxAge: 20000, fresh: fresh, onData: function (d) {
        if (!h()) return;
        boleh = d.peranBoleh;
        if (!tbl) tbl = UI.Tabel($('#tbl'), {
          cari: 'Cari email atau nama…', perHal: 20, kolom: [
            { k: 'email', l: 'Email', f: function (r) { return '<b>' + esc(r.email) + '</b>' + (r.email === me.email ? ' <span class="badge b-navy">Anda</span>' : ''); } },
            { k: 'nama', l: 'Nama' }, { k: 'peran', l: 'Peran', f: function (r) { return App.badge(r.peran, 'b-navy'); } },
            { k: 'status', l: 'Status', f: function (r) { return App.badge(r.status); } },
            { k: 'diubahOleh', l: 'Diubah oleh', f: function (r) { return '<span class="small">' + esc(r.diubahOleh || '-') + '</span><div class="tiny muted">' + fmt.tglJam(r.diubah) + '</div>'; } },
            { l: '', cls: 'aksi', sort: false, f: function (r) { return r.email === me.email ? '' : '<button class="btn btn-ghost btn-icon btn-sm" data-aksi="ubah" title="Ubah">' + ikon('edit') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-aksi="hapus" title="Hapus" style="color:var(--bad)">' + ikon('delete') + '</button>'; } }
          ], data: d.akun, kosong: { ikon: 'group', judul: 'Belum ada akun', teks: 'Tambah email Google petugas.' },
          onAksi: function (a, r) { if (a === 'ubah') form(r); if (a === 'hapus') hapus(r); }
        }); else tbl.setData(d.akun);
      } });
    }
    function form(r) {
      r = r || { status: 'Aktif', peran: boleh[0] };
      UI.Modal.buka({
        judul: r.email ? 'Ubah Akun' : 'Tambah Akun',
        isi: '<form id="fAkun" class="stack"><div class="field"><label>Email Google <span class="req">*</span></label><input class="inp" name="email" type="email" required ' + (r.email ? 'readonly' : '') + ' value="' + esc(r.email || '') + '" placeholder="nama@gmail.com"></div>' +
          '<div class="field"><label>Nama</label><input class="inp" name="nama" value="' + esc(r.nama || '') + '"></div>' +
          '<div class="field"><label>Peran <span class="req">*</span></label><select class="sel" name="peran">' + UI.Form.opsi(boleh, r.peran) + '</select>' + (boleh.length === 1 ? '<div class="hint">Peran Anda hanya dapat mengelola akun ' + esc(boleh[0]) + '.</div>' : '') + '</div>' +
          '<div class="field"><label>Status</label><select class="sel" name="status">' + UI.Form.opsi(['Aktif', 'Nonaktif'], r.status) + '</select></div></form>',
        tombol: [{ l: 'Batal' }, { l: 'Simpan', cls: 'btn-primary', aksi: function () {
          var f = $('#fAkun'); if (!UI.Form.wajib(f)) return false;
          return App.api('akun.simpan', UI.Form.data(f)).then(function () { App.toast('Akun tersimpan.', 'ok'); muat(true); });
        } }]
      });
    }
    function hapus(r) {
      UI.Modal.konfirm('Hapus <b>' + esc(r.email) + '</b> dari whitelist? Orang ini tidak bisa masuk lagi.', { judul: 'Hapus akun', ok: 'Hapus', bahaya: true }).then(function (ok) {
        if (ok) App.api('akun.hapus', { email: r.email }).then(function () { App.toast('Akun dihapus.', 'ok'); muat(true); }, function (e) { App.toast(e.message, 'bad'); });
      });
    }
    $('#tambah').onclick = function () { form(); };
    muat().catch(function (e) { $('#tbl').innerHTML = '<div class="card-b"><div class="note bad">' + ikon('error') + '<div>' + esc(e.message) + '</div></div></div>'; });
  }

  // ================================================================== HALAMAN BERSAMA: DATA PENGADUAN
  function halAduan(el, args, q, o) {
    o = o || {};
    var me = App.Sesi.me(), bisaHapus = ['Superadmin', 'Admin Konten', 'Admin Angkutan'].indexOf(me.role) > -1, tbl = null, data = [], h = hidup();
    el.innerHTML = judul(el, { eyebrow: 'Layanan', h: 'Data Pengaduan', p: 'Pengaduan umum dan laporan kendaraan dari masyarakat. Tanggapan yang ditandai tampil terlihat oleh pelapor di Cek Status.', aksi: '<button class="btn btn-outline" id="ekspor">' + ikon('download') + 'Ekspor Excel</button><button class="btn btn-outline" id="segar">' + ikon('refresh') + 'Segarkan</button>' }) +
      '<div class="grid g4" id="kpi">' + UI.sk.kartu(4) + '</div><div class="card" id="tbl" style="margin-top:16px">' + UI.sk.baris(8) + '</div>';
    function kpi(d) {
      var n = function (s) { return d.filter(function (x) { return x.status === s; }).length; };
      $('#kpi').innerHTML = [['Total', d.length, 'forum'], ['Diterima', n('Diterima'), 'mark_email_unread'], ['Diproses', n('Diproses'), 'pending'], ['Selesai', n('Selesai'), 'task_alt']].map(function (x) {
        return '<div class="card stat"><div class="lbl">' + x[0] + '<span class="ico">' + ikon(x[2]) + '</span></div><div class="val">' + fmt.angka(x[1]) + '</div></div>';
      }).join('');
    }
    function muat(fresh) {
      return App.swr('aduan.list', {}, { maxAge: 20000, fresh: fresh, onData: function (d) {
        if (o.onJumlah) o.onJumlah(d.filter(function (x) { return x.status === 'Diterima'; }).length);
        if (!h()) return;
        data = d; kpi(d);
        if (!tbl) tbl = UI.Tabel($('#tbl'), {
          cari: 'Cari kode, nopol, pelapor, isi…', perHal: 15,
          saringHtml: '<select class="sel" data-saring="status" style="width:160px;height:38px"><option value="">Semua status</option><option>Diterima</option><option>Diproses</option><option>Selesai</option></select>',
          saring: function (r, k, v) { return r[k] === v; },
          kolom: [
            { k: 'kode', l: 'Kode Tiket', f: function (r) { return '<b class="mono">' + esc(r.kode) + '</b>'; } },
            { k: 'tanggal', l: 'Tanggal', f: function (r) { return fmt.tgl(r.tanggal) + '<div class="tiny muted">' + fmt.relatif(r.tanggal) + '</div>'; } },
            { k: 'kategori', l: 'Jenis', f: function (r) { return esc(r.kategori || r.jenis); } },
            { k: 'nopol', l: 'Nopol', f: function (r) { return r.nopol ? App.plat(r.nopol, true) : '<span class="muted">—</span>'; } },
            { k: 'deskripsi', l: 'Isi', f: function (r) { return '<span class="small">' + esc(String(r.deskripsi || '').slice(0, 90)) + (String(r.deskripsi || '').length > 90 ? '…' : '') + '</span>'; } },
            { k: 'status', l: 'Status', f: function (r) { return App.badge(r.status); } }
          ], data: d, onRow: detail, kosong: { ikon: 'forum', judul: 'Belum ada pengaduan' }
        }); else tbl.setData(d);
      } });
    }
    function detail(r) {
      var lc = UI.Laci.buka({
        judul: 'Pengaduan ' + r.kode,
        isi: '<div class="stack"><div class="row wrap-row">' + App.badge(r.status) + (r.nopol ? App.plat(r.nopol, true) : '') + '<span class="muted small">' + fmt.tglJam(r.tanggal) + '</span></div>' +
          '<div class="dl"><div><dt>Jenis</dt><dd>' + esc(r.kategori || r.jenis) + '</dd></div><div><dt>Pelapor</dt><dd>' + esc(r.nama) + '</dd></div><div><dt>Kontak</dt><dd class="mono">' + esc(r.kontak) + '</dd></div><div><dt>Lokasi & waktu</dt><dd>' + esc(r.lokasi || '-') + '<div class="small muted">' + esc(r.waktu || '') + '</div></dd></div></div>' +
          '<div><div class="lbl-f">Isi pengaduan</div><div class="card card-b" style="white-space:pre-line">' + esc(r.deskripsi) + '</div></div>' +
          '<form id="fAdu" class="stack"><div class="field"><label>Status</label><div class="seg">' + ['Diterima', 'Diproses', 'Selesai'].map(function (s) { return '<label><input type="radio" name="status" value="' + s + '"' + (r.status === s ? ' checked' : '') + '>' + s + '</label>'; }).join('') + '</div></div>' +
          '<div class="field"><label>Catatan internal petugas</label><textarea class="ta" name="catatan" rows="3">' + esc(r.catatan || '') + '</textarea></div>' +
          '<div class="field"><label>Tanggapan untuk pelapor</label><textarea class="ta" name="tanggapan" rows="3">' + esc(r.tanggapan || '') + '</textarea>' +
          '<label class="switch" style="margin-top:8px"><input type="checkbox" name="tampilkan"' + (r.tampilkan ? ' checked' : '') + '><span>Tampilkan ke pelapor di Cek Status</span></label></div></form>' +
          (r.petugas ? '<div class="small muted">Terakhir diubah ' + esc(r.petugas) + ' · ' + fmt.tglJam(r.update) + '</div>' : '') + '</div>',
        kaki: (bisaHapus ? '<button class="btn btn-ghost" id="hapusAdu" style="color:var(--bad);margin-right:auto">' + ikon('delete') + 'Hapus</button>' : '') +
          (o.bisaSanksi && r.nopol ? '<button class="btn btn-outline" id="kSanksi">' + ikon('gavel') + 'Buat Sanksi</button>' : '') + '<button class="btn btn-primary" id="simpanAdu">' + ikon('save') + 'Simpan</button>'
      });
      $('#simpanAdu').onclick = function () {
        var d = UI.Form.data($('#fAdu')); d.id = r.id;
        UI.Form.muat(this, App.api('aduan.update', d)).then(function () { App.toast('Pengaduan diperbarui.', 'ok'); lc.tutup(); muat(true); }, function (e) { App.toast(e.message, 'bad'); });
      };
      if ($('#kSanksi')) $('#kSanksi').onclick = function () { lc.tutup(); location.hash = '#/sanksi?nopol=' + encodeURIComponent(r.nopol) + '&adu=' + encodeURIComponent(r.id) + '&alasan=' + encodeURIComponent('Pengaduan ' + r.kode + ': ' + String(r.deskripsi).slice(0, 120)); };
      if ($('#hapusAdu')) $('#hapusAdu').onclick = function () {
        UI.Modal.konfirm('Hapus pengaduan <b>' + esc(r.kode) + '</b> secara permanen?', { bahaya: true, ok: 'Hapus' }).then(function (ok) {
          if (ok) App.api('aduan.hapus', { id: r.id }).then(function () { App.toast('Pengaduan dihapus.', 'ok'); lc.tutup(); muat(true); }, function (e) { App.toast(e.message, 'bad'); });
        });
      };
    }
    $('#segar').onclick = function () { UI.Form.muat(this, muat(true)).catch(function (e) { App.toast(e.message, 'bad'); }); };
    $('#ekspor').onclick = function () {
      App.Xlsx.unduh('Pengaduan-' + fmt.hariIni(), [{ nama: 'Pengaduan', kolom: ['Kode Tiket', 'Tanggal', 'Jenis', 'Nopol', 'Pelapor', 'Kontak', 'Lokasi', 'Waktu Kejadian', 'Isi', 'Status', 'Tanggapan Publik', 'Ditampilkan'],
        baris: (tbl ? tbl.tersaring() : data).map(function (r) { return [r.kode, String(r.tanggal).slice(0, 10), r.kategori || r.jenis, r.nopol, r.nama, r.kontak, r.lokasi, r.waktu, r.deskripsi, r.status, r.tanggapan, r.tampilkan ? 'YA' : 'TIDAK']; }) }]);
    };
    muat().catch(function (e) { $('#tbl').innerHTML = '<div class="card-b"><div class="note bad">' + ikon('error') + '<div>' + esc(e.message) + '</div></div></div>'; });
  }

  // ================================================================== HALAMAN BERSAMA: SISTEM & KEAMANAN (Superadmin)
  function halSistem(el) {
    el.innerHTML = judul(el, { eyebrow: 'Superadmin', h: 'Sistem & Keamanan', p: 'Status database, rahasia konfigurasi (selalu tersamar), akses darurat, dan cadangan.' }) +
      '<div class="grid g2"><div class="card" id="stat">' + UI.sk.baris(6) + '</div><div class="card" id="rah">' + UI.sk.baris(6) + '</div></div>';
    var h = hidup();
    App.api('sistem.status', {}).then(function (s) {
      if (!h()) return;
      var pakai = Math.round(s.perkiraanSel / s.batasSel * 1000) / 10;
      $('#stat').innerHTML = '<div class="card-h"><h3>' + ikon('monitor_heart') + 'Status sistem</h3><span class="badge b-navy mono">v' + esc(s.versi) + '</span></div><div class="card-b stack">' +
        '<div class="dl"><div><dt>Superadmin aktif</dt><dd>' + s.konfigurasi.superadmin + (s.konfigurasi.superadmin < 2 ? ' <span class="badge b-warn">disarankan ≥ 2</span>' : '') + '</dd></div><div><dt>Client ID Google</dt><dd>' + (s.konfigurasi.googleClientId ? App.badge('YA') : App.badge('TIDAK')) + '</dd></div>' +
        '<div><dt>FRONTEND_URL</dt><dd class="small mono">' + esc(s.konfigurasi.frontendUrl || 'belum diisi') + '</dd></div><div><dt>Kapasitas Spreadsheet</dt><dd>' + pakai + '% dari 10 juta sel</dd></div>' +
        '<div><dt>keepWarm</dt><dd>' + (s.keepWarm ? 'nyala' : 'mati (disengaja)') + '</dd></div><div><dt>Pemanasan terakhir</dt><dd class="small">' + (s.warm ? fmt.tglJam(s.warm.at) + ' (' + esc(s.warm.scope) + ')' : '—') + '</dd></div></div>' +
        '<div><div class="lbl-f">Jumlah baris per sheet</div><div class="small mono" style="columns:2">' + Object.keys(s.baris).map(function (k) { return esc(k) + ': ' + s.baris[k]; }).join('<br>') + '</div></div>' +
        '<div class="row wrap-row"><a class="btn btn-outline btn-sm" href="' + esc(s.spreadsheetUrl) + '" target="_blank" rel="noopener">' + ikon('table') + 'Buka Spreadsheet</a><button class="btn btn-outline btn-sm" id="cadang">' + ikon('backup') + 'Buat cadangan sekarang</button></div></div>';
      $('#cadang').onclick = function () { UI.Form.muat(this, App.api('sistem.cadangan', {})).then(function (m) { App.toast('Cadangan dibuat di folder Cadangan Database.', 'ok'); }, function (e) { App.toast(e.message, 'bad'); }); };
    }, function (e) { if (h()) $('#stat').innerHTML = '<div class="card-b"><div class="note bad">' + ikon('error') + '<div>' + esc(e.message) + '</div></div></div>'; });
    App.api('rahasia.status', {}).then(function (r) {
      if (!h()) return;
      $('#rah').innerHTML = '<div class="card-h"><h3>' + ikon('key') + 'Rahasia & akses</h3></div><div class="card-b stack">' +
        '<form class="stack" id="fCid"><div class="field"><label>Google OAuth Client ID</label><input class="inp mono" name="nilai" style="text-transform:none" placeholder="' + esc(r.GOOGLE_CLIENT_ID.samar || '….apps.googleusercontent.com') + '" autocomplete="off"><div class="hint">Nilai publik. Kosongkan bila tidak diubah.</div></div><button class="btn btn-outline btn-sm">Simpan Client ID</button></form><hr>' +
        '<form class="stack" id="fTok"><div class="field"><label>Token Fonnte (WhatsApp) — modul notifikasi masih MATI</label><input class="inp" type="password" name="nilai" autocomplete="off" placeholder="' + esc(r.FONNTE_TOKEN.samar || 'belum ada') + '"></div><button class="btn btn-outline btn-sm">Simpan token</button></form><hr>' +
        '<div class="dl"><div><dt>SESSION_SECRET</dt><dd>' + esc(r.SESSION_SECRET.samar) + '</dd></div><div><dt>Akses darurat</dt><dd>' + (r.DARURAT.ada ? 'aktif · ' + esc(r.DARURAT.samar) : 'belum') + '</dd></div></div>' +
        '<form class="stack" id="fDar"><div class="field"><label>Ganti sandi akses darurat</label><input class="inp" type="password" name="sandiBaru" autocomplete="new-password" placeholder="min. 12 karakter, huruf + angka"></div><button class="btn btn-outline btn-sm">Ganti sandi darurat</button></form></div>';
      var kirimR = function (f, kunci) { f.onsubmit = function (e) { e.preventDefault(); var v = f.nilai.value.trim(); if (!v) return; UI.Form.muat(f.querySelector('button'), App.api('rahasia.simpan', { kunci: kunci, nilai: v })).then(function (x) { f.nilai.value = ''; f.nilai.placeholder = x.samar; App.toast('Tersimpan.', 'ok'); }, function (er) { App.toast(er.message, 'bad'); }); }; };
      kirimR($('#fCid'), 'GOOGLE_CLIENT_ID'); kirimR($('#fTok'), 'FONNTE_TOKEN');
      $('#fDar').onsubmit = function (e) { e.preventDefault(); var f = this; UI.Form.muat(f.querySelector('button'), App.api('darurat.rotasi', { sandiBaru: f.sandiBaru.value })).then(function () { f.reset(); App.toast('Sandi darurat diganti. Catat di tempat aman.', 'ok'); }, function (er) { App.toast(er.message, 'bad'); }); };
    }, function (e) { if (h()) $('#rah').innerHTML = '<div class="card-b"><div class="note bad">' + ikon('error') + '<div>' + esc(e.message) + '</div></div></div>'; });
  }

  // ================================================================== HALAMAN BERSAMA: MIGRASI DATA (Superadmin)
  function halImpor(el) {
    el.innerHTML = judul(el, { eyebrow: 'Superadmin', h: 'Migrasi Data dari Sistem Lama', p: 'Sistem lama hanya DIBACA, tidak diubah. Jalankan Pindai dulu, baru Jalankan Import. Aman diulang (tidak ada data dobel).' }) +
      '<div class="grid g2"><div class="card card-b"><form id="fImp" class="stack">' +
      '<div class="field"><label>Paket data</label><select class="sel" name="paket" id="paket"></select></div>' +
      '<div class="field"><label>URL atau ID Spreadsheet sistem lama <span class="req">*</span></label><input class="inp" name="sumber" required placeholder="https://docs.google.com/spreadsheets/d/…"><div class="hint">Gunakan akun Google yang sama dengan pemilik sistem lama agar foto/berkas Drive lama tetap terbaca.</div></div>' +
      '<div class="field"><label>Sheet yang diimpor</label><div id="sheetPil" class="stack"></div></div>' +
      '<label class="switch"><input type="checkbox" name="timpa"><span>Timpa data yang sudah ada di sistem baru (bawaan: tidak)</span></label>' +
      '<div class="row"><button type="button" class="btn btn-outline" id="pindai">' + ikon('search') + 'Pindai (dry-run)</button><button type="button" class="btn btn-primary" id="jalan">' + ikon('play_arrow') + 'Jalankan Import</button></div></form></div>' +
      '<div class="card" id="hasilImp"><div class="card-b"><div class="kosong">' + ikon('sync_alt') + '<h4>Belum ada hasil</h4><div>Hasil pindai atau import tampil di sini.</div></div></div></div></div>';
    var paket = [], h = hidup();
    App.api('import.paket', {}).then(function (p) {
      if (!h()) return;
      paket = p; $('#paket').innerHTML = p.map(function (x) { return '<option value="' + x.kunci + '">' + esc(x.judul) + '</option>'; }).join(''); pilih();
    });
    function pilih() {
      var p = paket.filter(function (x) { return x.kunci === $('#paket').value; })[0]; if (!p) return;
      $('#sheetPil').innerHTML = p.sheet.map(function (s) { return '<label class="chk"><input type="checkbox" name="sheet[]" value="' + s.target + '" checked><span><b>' + esc(s.target) + '</b> <span class="muted small">← ' + esc(s.sumber) + '</span></span></label>'; }).join('');
    }
    $('#paket').onchange = pilih;
    function kirim(dry, btn) {
      var f = $('#fImp'); if (!UI.Form.wajib(f)) return;
      var d = UI.Form.data(f); d.dryRun = dry;
      var go = function () {
        UI.Form.muat(btn, App.api('import.jalankan', d)).then(function (r) {
          $('#hasilImp').innerHTML = '<div class="card-h"><h3>' + (r.dryRun ? 'Hasil pindai' : 'Hasil import') + '</h3><span class="small muted">' + esc(r.sumber.nama) + '</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sheet</th><th class="right">Di sumber</th><th class="right">Ditambah</th><th class="right">Diperbarui</th><th class="right">Dilewati</th></tr></thead><tbody>' +
            Object.keys(r.laporan).map(function (k) { var x = r.laporan[k]; return '<tr><td><b>' + esc(k) + '</b>' + (x.catatan ? '<div class="tiny muted">' + esc(x.catatan) + '</div>' : '') + '</td><td class="right mono">' + x.sumber + '</td><td class="right mono">' + x.ditambah + '</td><td class="right mono">' + x.diperbarui + '</td><td class="right mono">' + x.dilewati + '</td></tr>'; }).join('') +
            '</tbody></table></div>' + (r.peringatan.length ? '<div class="card-b"><div class="note warn">' + ikon('warning') + '<div><b>Peringatan</b><ul style="margin:6px 0 0;padding-left:18px">' + r.peringatan.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div></div></div>' : '');
          App.toast(r.dryRun ? 'Pindai selesai. Tidak ada yang ditulis.' : 'Import selesai.', 'ok');
          if (!r.dryRun) App.Simpan.bersihkan();
        }, function (e) { App.toast(e.message, 'bad'); });
      };
      if (dry) go(); else UI.Modal.konfirm('Jalankan import sekarang? Data sistem lama hanya dibaca.', { ok: 'Jalankan' }).then(function (ok) { if (ok) go(); });
    }
    $('#pindai').onclick = function () { kirim(true, this); };
    $('#jalan').onclick = function () { kirim(false, this); };
  }

  window.Shell = { hidup: hidup, mulai: mulai, judul: judul, badgeMenu: badgeMenu, halAkun: halAkun, halAduan: halAduan, halSistem: halSistem, halImpor: halImpor, keluar: keluar, riwayatVersi: riwayatVersi, MODUL: MODUL };
})();
