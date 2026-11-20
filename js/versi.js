/* Versi aplikasi — WAJIB sama dengan sw.js (simau & etle), backend/Config.gs APP.versi, dan CHANGELOG.md */
window.APP_VERSI = '1.3.1';
window.RIWAYAT_VERSI = [
  { v: '1.3.1', tgl: '2026-11-20', isi: [
    '[ETLE] Superadmin & Admin ETLE: tombol Hapus draf di Detail Kasus panel admin',
    '[ETLE] Saringan "Draf terbengkalai" (≥ 3/7/14/30 hari tidak diubah) di Semua Kasus, centang lalu hapus beberapa sekaligus',
    '[ETLE] Kartu jumlah draf terbengkalai (≥ 7 hari) di Dashboard; umur draf dihitung dari terakhir diubah',
    '[ETLE] HP petugas memberi tahu bila drafnya sudah dihapus admin dan mengosongkan draf lokal',
    '[Perbaikan] Simpan draf di HP tidak lagi macet setelah satu kali gagal (mis. sinyal putus)'
  ] },
  { v: '1.3.0', tgl: '2026-11-20', isi: [
    '[ETLE] Sanksi dikenakan dipilih SATU per surat (pilihan tunggal); server menolak lebih dari satu',
    '[ETLE] Foto bukti 4 kotak: plat depan*, plat belakang*, situasi pelanggaran, tambahan (uji berkala: bukti uji*)',
    '[Semua] Ikon aplikasi memakai logo Dishub; tombol "Pasang aplikasi" + petunjuk iPhone/Android di SIMAU, ETLE, website, dan Panel Konten',
    '[Perbaikan] Kontrol peta tidak lagi menembus jendela Tambah halte; pasal tidak tampil dua kali di Detail Kasus'
  ] },
  { v: '1.2.0', tgl: '2026-11-20', isi: [
    '[Konten] Menu Logo: unggah logo utama dan logo kanan kop langsung dari web, tanpa mengubah berkas frontend',
    '[Sistem] Logo unggahan dipakai di header situs & panel, ikon tab browser, kop Kartu Pengawasan, laporan, dan Surat Penindakan ETLE',
    '[Sistem] Perangkat lain memperbarui logo otomatis saat membuka halaman berikutnya'
  ] },
  { v: '1.1.0', tgl: '2026-11-20', isi: [
    '[SIMAU] Satu kendaraan = satu checklist bernomor tetap (CEK-xxxx), tidak berubah walau diperiksa berkali-kali',
    '[SIMAU] Riwayat pemeriksaan per checklist: tanggal, hasil, petugas, rincian 15 item; hapus satu pemeriksaan tanpa mengubah nomor',
    '[SIMAU] Tombol "Salin cek terakhir" untuk mengisi formulir cek dari hasil sebelumnya',
    '[Migrasi] Pemeriksaan sistem lama dikelompokkan per nomor polisi; nomor checklist = ID pemeriksaan pertamanya',
    '[Sistem] Nomor kendaraan & checklist yang masih dirujuk riwayat tidak dipakai ulang'
  ] },
  { v: '1.0.0', tgl: '2026-11-20', isi: [
    '[Sistem] Satu backend, satu Spreadsheet, satu repo untuk Landing Page, SIMAU, dan ETLE Dishub',
    '[Sistem] Login Google + whitelist email, sesi 6 jam, 7 peran dicek server setiap permintaan',
    '[SIMAU] Kartu Pengawasan terintegrasi ETLE: kasus Terbit/Tindak Lanjut menghalangi penerbitan',
    '[ETLE] Catat → foto → pratinjau → terbit, nomor surat tidak dipakai ulang, koreksi/batal dengan alasan',
    '[Landing] Beranda, Profil, Berita, Pengumuman, Regulasi, Pengaduan, Cek Status, Survei, Statistik'
  ] }
];
