# Remi Properti

[![Make the best card game](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![Rank](https://make.fun/badge/best-card-game-20261122-1826/rooneynft/remi-properti/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![Reward](https://make.fun/badge/best-card-game-20261122-1826/rooneynft/remi-properti/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

**Remi Properti** — game kartu yang menggabungkan remi dengan jual-beli
properti asli Indonesia. Dibangun untuk kontes
[Make the best card game](https://make.fun/bounty/best-card-game-20261122-1826)
di make.fun.

## Cara main

- Ambil satu kartu tiap giliran, dari deck atau dari buangan.
- Bentuk **set** (3 kartu nilai sama, $100) atau **run** (3 kartu suit sama
  berurutan, $150) — tombol **Bentuk Meld** atau tekan `M`.
- Uang hasil meld dipakai **beli properti** di pasar (klik kartunya).
  Propertinya asli Indonesia: Warung Kopi, Pasar Pagi, Villa Pantai,
  Hotel Melati, dan delapan lagi, dalam empat kelompok warna.
- Punya semua properti satu warna = set lengkap, lawan bayar kamu
  **sewa $60 tiap ronde** (dan sebaliknya).
- Lawan AI main remi juga: ambil kartu, bentuk meld, beli properti, buang kartu.
- **Menang** kalau pertama sampai $1000 atau lawan bangkrut. **Kalah** kalau
  lawan sampai $1000 duluan atau kamu bangkrut.

## Kontrol

- Mouse: klik deck / buangan / tombol / properti / kartu tangan.
- Keyboard: `D` ambil dari deck, `B` ambil dari buangan, `M` bentuk meld,
  `Enter` mulai / main lagi, `Esc` kembali ke judul.

## Menjalankan

```sh
node serve.ts
# buka http://localhost:8080
```

Game berupa file statis di `game/` — tanpa build step, tanpa network request,
jalan offline di desktop browser. Screenshot di `screenshots/` adalah render
asli dari kode game ini (`?shot=start|play|win|lose&seed=1`).

## Struktur

- `game/index.html` — halaman game
- `game/src/main.js` — state machine, giliran, input, staging screenshot
- `game/src/cards.js` — deck 52 kartu, kocok, deteksi set/run
- `game/src/properties.js` — katalog 12 properti + aturan sewa
- `game/src/ai.js` — lawan AI
- `game/src/render.js` — semua gambar di canvas 1280x720
- `main.ts` — program hand-in (Node 22, stdlib saja)

Lisensi: MIT.
