'use client';

import { useState } from 'react';
import { site } from '@/lib/site';

const CHAIN_HEX = '0x' + site.chainId.toString(16);
const CHAIN_PARAMS = {
  chainId: CHAIN_HEX,
  chainName: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
  blockExplorerUrls: ['https://robinhoodchain.blockscout.com'],
};
const word = (hex) => hex.replace(/^0x/, '').toLowerCase().padStart(64, '0');
const uint = (n) => word(BigInt(n).toString(16));
const fmtWei = (wei) => {
  const v = BigInt(wei);
  const whole = v / 10n ** 18n;
  const frac = (v % 10n ** 18n).toString().padStart(18, '0').slice(0, 2);
  return `${whole.toLocaleString('en-US')}.${frac}`;
};

// LastbreathWill.claim(uint256 generation, address account, uint256 amount, bytes32[] proof) = 0x2e7ba6ef
function encodeClaim(gen, account, amount, proof) {
  return '0x2e7ba6ef' + uint(gen) + word(account) + uint(amount) + uint(128) + uint(proof.length) + proof.map(word).join('');
}
// LastbreathWill.isClaimed(uint256,address) = 0xd2ef0795
const encodeIsClaimed = (gen, account) => '0xd2ef0795' + uint(gen) + word(account);

/** Lets an heir connect a wallet and claim their share of the latest will. */
export default function ClaimWill() {
  const [st, setSt] = useState({ phase: 'idle' });
  const ready = site.agentApi && site.willContract;

  const run = async () => {
    const eth = typeof window !== 'undefined' ? window.ethereum : null;
    if (!eth) return setSt({ phase: 'error', msg: 'No wallet found. Open this page inside your wallet app’s browser.' });
    try {
      setSt({ phase: 'loading', msg: 'Connecting wallet…' });
      const [account] = await eth.request({ method: 'eth_requestAccounts' });
      try {
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] });
      } catch {
        // Wallet doesn't know the chain yet: offer to add it, then switch.
        try {
          await eth.request({ method: 'wallet_addEthereumChain', params: [CHAIN_PARAMS] });
          await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] });
        } catch {
          return setSt({ phase: 'error', msg: 'Switch your wallet to Robinhood Chain and try again.' });
        }
      }
      setSt({ phase: 'loading', msg: 'Reading the will…' });
      const api = site.agentApi.replace(/\/$/, '');
      const latest = await fetch(`${api}/will/latest`, { cache: 'no-store' }).then((r) => r.json());
      if (!latest) return setSt({ phase: 'none', msg: 'No generation has died yet. Nothing to inherit.' });
      const r = await fetch(`${api}/will/${latest.generation}/${account}`, { cache: 'no-store' }).then((x) => x.json());
      if (!r.heir) return setSt({ phase: 'none', msg: `This wallet is not in Gen ${latest.generation}’s will.` });
      const claimed = await eth.request({ method: 'eth_call', params: [{ to: site.willContract, data: encodeIsClaimed(latest.generation, account) }, 'latest'] });
      if (BigInt(claimed || '0x0') === 1n) return setSt({ phase: 'done', msg: `Already claimed: ${fmtWei(r.heir.amount)} $BREATH from Gen ${latest.generation}.` });
      setSt({ phase: 'ready', account, gen: latest.generation, heir: r.heir });
    } catch (e) {
      setSt({ phase: 'error', msg: e?.message || 'Something went wrong.' });
    }
  };

  const claim = async () => {
    const { account, gen, heir } = st;
    try {
      setSt((s) => ({ ...s, phase: 'sending' }));
      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: account, to: site.willContract, data: encodeClaim(gen, account, heir.amount, heir.proof) }],
      });
      setSt({ phase: 'done', msg: `Claimed ${fmtWei(heir.amount)} $BREATH. Tx: ${hash.slice(0, 10)}…` });
    } catch (e) {
      setSt((s) => ({ ...s, phase: 'ready', err: e?.message || 'Transaction cancelled.' }));
    }
  };

  return (
    <div className="claim">
      <div className="claim-head">
        <span className="vital-label">Claim your inheritance</span>
        {!ready && <span className="claim-tag mono">OPENS AFTER THE FIRST DEATH</span>}
      </div>
      {ready && (st.phase === 'idle' || st.phase === 'error' || st.phase === 'none') && (
        <button type="button" className="btn btn-primary" onClick={run}>Connect wallet &amp; check</button>
      )}
      {st.phase === 'loading' && <p className="muted claim-msg">{st.msg}</p>}
      {(st.phase === 'ready' || st.phase === 'sending') && (
        <div className="claim-ready">
          <div>
            <span className="mono muted">Gen {st.gen} left you</span>
            <b>{fmtWei(st.heir.amount)} $BREATH</b>
            <small className="muted">
              {BigInt(st.heir.holderShare) > 0n && `${fmtWei(st.heir.holderShare)} as a holder`}
              {BigInt(st.heir.holderShare) > 0n && BigInt(st.heir.saviorShare) > 0n && ' · '}
              {BigInt(st.heir.saviorShare) > 0n && `${fmtWei(st.heir.saviorShare)} as a savior`}
            </small>
          </div>
          <button type="button" className="btn btn-primary" disabled={st.phase === 'sending'} onClick={claim}>
            {st.phase === 'sending' ? 'Confirm in wallet…' : 'Claim'}
          </button>
          {st.err && <p className="warn claim-msg">{st.err}</p>}
        </div>
      )}
      {(st.phase === 'error' || st.phase === 'none' || st.phase === 'done') && <p className={`claim-msg ${st.phase === 'error' ? 'warn' : ''}`}>{st.msg}</p>}
      {!ready && <p className="muted claim-msg">When a generation flatlines, holders and saviors claim their share here with their wallet.</p>}
    </div>
  );
}
