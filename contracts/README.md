# LastbreathWill — kontrak treasury & warisan

Satu kontrak kecil tanpa dependency (`LastbreathWill.sol`, Solidity ^0.8.24).

## Cara kerja

| Bagian | Siapa | Apa |
| --- | --- | --- |
| Treasury | — | Saldo $BREATH di kontrak ini. Wallet agent membeli $BREATH (30% creator fee) lalu mengirimnya ke kontrak dengan transfer biasa. |
| Tidak bisa ditarik | — | Tidak ada fungsi withdraw. Token hanya bisa keluar lewat `claim()`. |
| `settle(root, payout, uri)` | agent | Dipanggil saat sebuah generasi mati. `payout` maksimal 90% dari treasury bebas (70% holder + 20% savior); minimal 10% tertinggal untuk generasi berikutnya. |
| `claim(gen, akun, jumlah, proof)` | siapa saja | Ahli waris mengklaim bagiannya dengan Merkle proof (tombol di website). |
| `release(gen)` | siapa saja | Setelah 90 hari, sisa yang tidak diklaim kembali ke treasury. |
| `setAgent`, `transferOwnership` | owner | Ganti wallet agent / pemilik. |

Kepercayaan: agent yang menyusun snapshot. Setiap snapshot (daftar lengkap ahli waris + root) dipublikasikan di `/will/<gen>` pada API agent, jadi siapa pun bisa menghitung ulang sebelum klaim.

## Deploy (Remix, dari laptop)

1. Buka remix.ethereum.org → buat file `LastbreathWill.sol` → tempel isi kontrak.
2. Compiler: versi 0.8.24 atau lebih baru → **Compile**.
3. Deploy & Run → Environment: **Injected Provider** (wallet di jaringan Robinhood Chain).
4. Isi constructor:
   - `token_` = alamat kontrak $BREATH
   - `agent_` = alamat wallet agent (yang akan memanggil `settle`)
5. **Deploy**. Alamat kontrak ini = `WILL_CONTRACT` (agent) dan `NEXT_PUBLIC_WILL_CONTRACT` (website).

## Wajib sebelum dipakai dengan uang sungguhan

- Uji dulu di **testnet** Robinhood Chain dengan token tes: transfer token ke kontrak → `settle` → `claim` dari 2–3 wallet → coba klaim dua kali (harus gagal) → coba proof palsu (harus gagal).
- Kontrak ini **belum diaudit** dan belum dikompilasi di lingkungan pembuatnya. Minta developer Solidity meninjau sebelum memegang dana besar.

## Saat sebuah generasi mati

1. Agent otomatis membuat snapshot dan menyimpan `data/wills/will-gen-<N>.json`, lalu mencetak di log:
   `settle(<root>, <payout>, "<url>")`
2. Wallet agent memanggil `settle` dengan nilai itu (lewat Remix atau block explorer).
3. Ahli waris klaim di website (bagian Inheritance → *Claim your inheritance*).
