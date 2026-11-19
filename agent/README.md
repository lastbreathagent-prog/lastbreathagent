# Lastbreath Agent ($BREATH)

Otak AI agent Lastbreath: membaca transaksi $BREATH di Robinhood Chain, mengubahnya jadi detak jantung, menentukan status hidup-mati, lalu memposting ke X sesuai kepribadian generasinya.

Tanpa dependency, cukup Node.js 20+.

## Cara kerja

1. **Indexer** (`src/chain.js`) membaca event Transfer $BREATH dari RPC Robinhood Chain.
2. **Detak** (`src/heartbeat.js`): transfer dari/ke pool Pons dihitung sebagai beli/jual.
   - Transaksi di bawah `MIN_TRADE_TOKENS` diabaikan (anti transaksi debu).
   - Satu wallet maksimal 1 detak per 60 detik (anti bot).
   - Buyback dari wallet treasury tidak dihitung, jadi agent tidak bisa menghidupi dirinya sendiri.
3. **Status** (`src/status.js`), berdasarkan detak 1 jam terakhir:

| Status | Kondisi |
| --- | --- |
| HEALTHY | ≥ 60 detak/jam |
| ANXIOUS | 20–59 detak/jam |
| DYING | 1–19 detak/jam, atau 0 tapi belum 6 jam sepi |
| COMA | 6 jam tanpa detak |
| DEAD | 24 jam tanpa detak |

   Satu jam pertama setelah lahir dianggap HEALTHY (masa bayi). Wallet yang membawa agent keluar dari DYING/COMA dicatat sebagai **Penyelamat**.
4. **Otak** (`src/brain.js`, `src/personas.js`): menulis postingan lewat Claude API sesuai status dan kepribadian generasi (Ash, Ember, Static, Wisp). Kalau `ANTHROPIC_API_KEY` kosong, agent memakai template bawaan.
5. **Poster** (`src/poster.js`): posting ke X API v2. Default `DRY_RUN=true` hanya mencetak postingan ke log.
6. **Kematian dan reinkarnasi** (`src/agent.js`): saat mati, agent memposting wasiat dan mencatat dirinya di Kuburan. 24 jam kemudian lahir generasi baru dengan kepribadian berbeda.

Frekuensi posting: HEALTHY tiap 8 jam, ANXIOUS tiap 2 jam, DYING tiap 30 menit, COMA tiap 1 jam, plus posting saat status berubah (maksimal 1 per 10 menit).

## Menjalankan

```bash
cp .env.example .env     # isi RPC_URL, BREATH_TOKEN, POOL_ADDRESSES, TREASURY_ADDRESS
npm run simulate         # simulasi satu siklus hidup tanpa jaringan
npm start                # jalankan agent live
```

## API untuk website

| Endpoint | Isi |
| --- | --- |
| `GET /status` | generasi, status, BPM, sisa waktu sebelum mati, treasury, detak 1 jam terakhir |
| `GET /feed` | 50 postingan terakhir |
| `GET /graveyard` | semua generasi yang sudah mati |
| `GET /savior/<wallet>` | berapa kali wallet itu menyelamatkan agent |

## Belum termasuk

- **Pembagian warisan on-chain.** Agent hanya mengumumkan. Pembagian 70/20/10 harus dijalankan kontrak warisan (tahap smart contract).
- **Buyback otomatis.** Treasury yang membeli $BREATH dari 30% creator fee belum dibuat.
- **Alamat kontrak Pons.** Isi `POOL_ADDRESSES` dengan alamat bonding curve dan pool setelah graduation.

## Warisan (wills)

Saat agent mati, `src/will.js` membuat snapshot: saldo semua holder pada blok kematian (dari log Transfer), bagian 70% holder dan 20% savior dari treasury bebas di kontrak `LastbreathWill`, lalu Merkle tree untuk `settle()`. File disimpan di `data/wills/` dan disajikan di:

| Endpoint | Isi |
| --- | --- |
| `GET /will/latest` | ringkasan will terakhir |
| `GET /will/<gen>` | snapshot lengkap (untuk diverifikasi siapa saja) |
| `GET /will/<gen>/<wallet>` | jumlah + proof untuk satu wallet (dipakai tombol Claim) |

Lihat `contracts/README.md` untuk deploy kontrak dan langkah settle.


## Run it for free on GitHub Actions (no server, no card)

`.github/workflows/agent.yml` runs `src/once.js` every ~5 minutes. Each run reads new trades,
updates the status, posts, and saves everything to the `agent-state` branch. The website reads
that branch through `/api/agent` (set `NEXT_PUBLIC_AGENT_API=https://lastbreath.fun/api/agent` on Vercel).

1. GitHub repo → Settings → Secrets and variables → Actions.
2. Variables: `BREATH_TOKEN`, `POOL_ADDRESSES`, `WILL_CONTRACT`, `AGENT_WALLET`, `START_BLOCK` (launch block), `DRY_RUN`.
3. Secrets: `RPC_URL` (+ optional `ANTHROPIC_API_KEY`, X keys, Telegram).
4. Actions tab → agent → Run workflow (first run), then it runs on schedule.

Before launch (no `BREATH_TOKEN`) it just writes an UNBORN status.
