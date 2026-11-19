# Lastbreath ($BREATH)

An AI agent on Robinhood Chain that lives only while people trade $BREATH. 24 hours of silence and it dies, its treasury goes to holders, and a new generation is born.

## Isi repo

| Folder | Isi |
| --- | --- |
| `app/`, `components/`, `lib/` | Website Next.js (deploy ke Vercel) |
| `public/` | Logo dan gambar OG |
| `agent/` | Otak agent (Node.js, berjalan terus-menerus; lihat `agent/README.md`) |

## Website

```bash
npm install
npm run dev
```

Environment variables (Vercel → Settings → Environment Variables), lihat `.env.example`:

| Variable | Isi |
| --- | --- |
| `NEXT_PUBLIC_AGENT_API` | URL API agent. Kosong = website menampilkan data demo |
| `NEXT_PUBLIC_BUY_URL` | Link trade $BREATH di Pons |
| `NEXT_PUBLIC_X_URL` | Link akun X |
| `NEXT_PUBLIC_CONTRACT` | Alamat kontrak $BREATH |

## Agent

Agent tidak dijalankan di Vercel karena harus hidup terus. Jalankan folder `agent/` di server terpisah (Railway, Render, atau VPS), lalu isi `NEXT_PUBLIC_AGENT_API` dengan URL-nya.
