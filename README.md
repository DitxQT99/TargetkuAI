# TARGETKU — REAL WEB PUSH

Versi ini mempertahankan TARGETKU dan mengganti reminder browser lama menjadi Web Push nyata.

## Struktur

```text
targetku/
├── index.html
├── app.js
├── styles.css
├── sw.js
├── manifest.webmanifest
├── icon.svg
├── icon-192.png
├── icon-512.png
├── package.json
├── vercel.json
├── .env.example
├── .gitignore
├── README.md
├── RESEARCH-NOTES.md
├── database/
│   └── schema.sql
└── api/
    ├── _lib.js
    ├── push-config.js
    ├── subscribe.js
    ├── unsubscribe.js
    ├── reminder.js
    ├── test-notification.js
    └── send-notification.js
```

## Yang berubah

Tidak ada lagi `setInterval()` untuk mengecek reminder background dan tidak ada `new Notification()` sebagai pengganti Web Push.

Alur:

```text
Android
→ Notification permission
→ Service Worker /sw.js
→ PushManager.subscribe()
→ /api/subscribe
→ Neon PostgreSQL
→ /api/reminder
→ next_run_at
→ Vercel Cron /api/send-notification
→ web-push + VAPID
→ browser push service
→ sw.js "push"
→ showNotification()
→ Android
```

Subscription disimpan persistent di PostgreSQL. `localStorage` hanya dipakai oleh aplikasi lama dan untuk random `deviceId`, bukan sebagai database PushSubscription.

## Environment Variables

Buat di Vercel:

```text
DATABASE_URL=postgresql://...
VAPID_SUBJECT=mailto:email@domain-kamu
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
CRON_SECRET=...
```

Jangan pernah menaruh `DATABASE_URL`, `VAPID_PRIVATE_KEY`, atau `CRON_SECRET` di frontend/GitHub.

## Database

Buat database Neon lalu jalankan:

```text
database/schema.sql
```

Tabel:
- `push_subscriptions`
- `reminders`

## Generate VAPID

Install dependency:

```bash
npm install
```

Generate key sekali:

```bash
node -e "const webpush=require('web-push'); console.log(webpush.generateVAPIDKeys())"
```

Simpan `publicKey` dan `privateKey`. Key ini tidak perlu dibuat ulang setiap deployment.

## Deploy

```bash
npm install
npx vercel deploy --prod
```

Cron hanya aktif pada Production deployment.

Setelah deploy:

```text
https://domain-kamu/api/push-config
```

harus menghasilkan:

```json
{"publicKey":"..."}
```

## Cron

`vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/send-notification",
      "schedule": "* * * * *"
    }
  ]
}
```

Ini membutuhkan precision cron per-menit. Vercel saat ini membatasi Hobby menjadi sekali per hari; Pro/Enterprise menyediakan precision per-menit. Cron memakai UTC, tetapi backend Targetku menggunakan IANA timezone browser seperti `Asia/Jakarta` untuk menghitung jadwal reminder.

## Aktifkan Notifikasi

Di Android:

```text
TARGETKU
→ Profil
→ Notifikasi
→ Aktifkan
→ Allow
→ status "Notifikasi Aktif"
```

Frontend:
1. request permission
2. register Service Worker
3. subscribe via PushManager
4. kirim subscription ke `/api/subscribe`
5. simpan subscription di database
6. sinkronkan reminder aktif

## Test Push

Pada bagian Notifikasi ada tombol `Test`.

Tombol ini tidak membuat local notification.

Jalur test:

```text
TARGETKU
→ /api/test-notification
→ Neon
→ web-push
→ push service
→ sw.js
→ showNotification()
```

Test ini sebaiknya dilakukan dulu sebelum menguji scheduler reminder.

## Reminder

Target existing tetap mendukung:
- harian
- Senin–Jumat
- weekly hari tertentu
- custom N hari/minggu
- saat waktu target
- 10 menit sebelumnya
- 30 menit sebelumnya

Isi `Catatan` menjadi body notifikasi.

Saat target disimpan:
- backend menghitung `next_run_at`

Saat target dihapus:
- reminder remote dihapus

Saat reminder `off`:
- row reminder remote dihapus

## Service Worker

`sw.js`:
- cache/PWA
- menerima `push`
- menjalankan `self.registration.showNotification()`
- menangani `notificationclick`
- fokus/buka TARGETKU

API route tidak di-cache oleh Service Worker.

## Reliability

Backend menggunakan:
- validation
- upsert subscription
- satu endpoint aktif untuk satu `deviceId`
- database lock untuk mencegah dua cron memproses row yang sama
- retry error sementara
- cleanup HTTP `404`/`410`
- perhitungan timezone server-side

Web Push tetap tidak berarti detik-presisi absolut. Android, browser, jaringan, push service, Doze, dan battery policy dapat menunda delivery.

## Security

Endpoint state-changing memeriksa same-origin.

Cron endpoint memeriksa:

```text
Authorization: Bearer <CRON_SECRET>
```

`deviceId` merupakan identifier acak per browser/device. Versi ini belum merupakan sistem login/account dan cocok untuk satu browser/device. Multi-device memerlukan authentication layer.

## Testing Android

### A. Subscription

```text
HTTPS production
→ Aktifkan notifikasi
→ Allow
→ "Notifikasi Aktif"
```

### B. Test Push

```text
Tekan Test
→ minimize TARGETKU
→ tunggu notification
```

### C. Reminder

```text
Buat target
→ pilih waktu dekat
→ pilih Pengingat
→ Simpan
→ cek tabel reminders
→ tunggu cron
```

### D. Layar mati

```text
Minimize
→ matikan layar
→ tunggu reminder
→ buka notification
```

## Troubleshooting

### Browser Tidak Mendukung

Pastikan:
- HTTPS
- bukan `file://`
- Service Worker tersedia
- Push API tersedia

### Notifikasi Belum Diizinkan

Periksa izin notification untuk origin TARGETKU di browser Android.

### Test push gagal

Cek:
```text
DATABASE_URL
VAPID_SUBJECT
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

lalu cek Vercel Function logs.

### Reminder tidak masuk

Cek:
```text
reminders.active
reminders.next_run_at
reminders.last_error
Vercel Cron
Production deployment
timezone
```

## Audit

Jalankan:

```bash
npm run check
```

Periksa juga:

```text
[ ] tidak ada setInterval(tickReminders)
[ ] tidak ada function tickReminders
[ ] tidak ada new Notification(
[ ] ada PushManager.subscribe()
[ ] ada Service Worker
[ ] ada push event
[ ] ada showNotification()
[ ] /api/subscribe
[ ] /api/unsubscribe
[ ] /api/reminder
[ ] /api/test-notification
[ ] /api/send-notification
[ ] private VAPID key hanya backend
[ ] CRON_SECRET hanya backend
[ ] DATABASE_URL hanya backend
```

## TARGETKU AI

TARGETKU sekarang memiliki halaman chat **TARGETKU AI** dengan UI percakapan seperti chat modern. AI menggunakan endpoint Faa berikut:

```text
https://api-faa.my.id/faa/ai-promt
```

Kontrak upstream mengikuti endpoint pada screenshot: parameter `prompt` dan `query`, dengan respons JSON yang dibaca dari field `response`. Frontend mengirimnya lebih dulu melalui proxy same-origin `POST /api/ai-chat` agar browser tidak bergantung pada CORS upstream. Bila proxy tidak tersedia, frontend mencoba endpoint upstream secara langsung.

Context yang dikirim ke AI diringkas dari state TARGETKU: profil dasar, target aktif, status target hari ini, progress 14 hari, streak, XP/level, achievement, frame, progress mingguan/bulanan, dan statistik. Foto profil tidak dikirim.

AI memiliki system prompt khusus TARGETKU yang membatasi topik dan meminta jawaban persis `Sorry, I can't help you with that.` untuk pertanyaan di luar topik.
