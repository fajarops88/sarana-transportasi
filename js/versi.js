/* Versi aplikasi — WAJIB sama dengan sw.js (simau & etle), backend/Config.gs APP.versi, dan CHANGELOG.md */
window.APP_VERSI = '1.1.0';
window.RIWAYAT_VERSI = [
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
