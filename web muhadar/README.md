# Undangan Muhadar & Nia — Keumala-inspired rebuild

Rebuild statis HTML/CSS/JS dengan aset lokal. Project ini tidak memuat WordPress, Elementor, CSS/JS remote template sumber, atau request ke domain template sumber.

## Jalankan lokal

Cara termudah di Windows: double-click `run-local.bat`.

Atau dari terminal di folder project:

```bash
python -m http.server 8080
```

Lalu buka:

```text
http://localhost:8080/?to=Nama%20Tamu
```

Parameter `?to=` otomatis mengisi nama tamu di cover dan form.

## Data utama

Edit `js/data.js` untuk:

- data Muhadar & Nia
- tanggal/jam/lokasi acara
- link Maps
- target countdown
- rekening/e-wallet
- alamat kirim hadiah
- toggle fitur
- daftar gallery
- Love Story
- file musik

Data saat ini:

- Akad: Kamis, 29 Oktober 2026 — 10.00 WIB s/d selesai — Tanjong Glumpang, Kec. Baktiya, Aceh Utara.
- Resepsi pihak pria: Selasa, 24 November 2026 — 10.00 WIB s/d selesai — Desa Bungong, Kec. Syamtalira Bayu, Aceh Utara.
- Countdown utama mengarah ke resepsi 24 November 2026.
- Link Maps resepsi masih link sementara dari klien.

## Musik

Taruh lagu di:

`assets/music/wedding-song.mp3`

Musik baru mulai setelah tamu menekan **Buka Undangan** agar tidak diblokir aturan autoplay browser.

## RSVP / Ucapan / Sharing Memories

Versi build ini sengaja punya fallback lokal supaya seluruh UI dan flow dapat dites sebelum backend production dipasang:

- RSVP disimpan ke `localStorage` browser.
- Ucapan & Doa disimpan ke `localStorage` dan menggunakan tombol **Muat lebih banyak**.
- Sharing Memories mengompres foto di browser lalu menyimpan beberapa foto terakhir ke storage lokal dan menampilkannya di memory wall.

Artinya data tersebut hanya terlihat pada browser/perangkat yang sama. Untuk production multi-tamu, sambungkan fungsi penyimpanannya ke API/Supabase/Firebase/storage backend final.

## Wedding Gift

UI Wedding Gift aktif, tetapi rekening/e-wallet masih kosong. Isi `gift.accounts` di `js/data.js` ketika data klien tersedia. Alamat kirim hadiah sementara `Desa Bungong`.

## Fitur

Saat ini:

- Gallery: aktif
- Wedding Gift: aktif
- RSVP: aktif
- Love Story: aktif
- Sharing Memories: aktif
- Ucapan & Doa: aktif
- Live Streaming: nonaktif/tidak dirender
- QR Check-in: nonaktif/tidak dirender

## Share image

Gambar share/OG memakai:

`assets/images/cover/cover-utama.webp`

Saat domain production sudah diketahui, ubah `og:image` di `index.html` menjadi URL absolut agar preview WhatsApp/Facebook lebih konsisten.

## Struktur penting

```text
index.html
css/style.css
js/data.js
js/app.js
assets/
  fonts/
  images/
    backgrounds/
    ornaments/
    cover/
    couple/
    gallery/
  music/
```
