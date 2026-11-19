#!/usr/bin/env bash
# One-shot end-to-end test of LastbreathWill on Robinhood Chain TESTNET.
# Deploys a test token + the will contract, funds the treasury, settles a will
# for two heirs, claims, and checks that a second claim is refused.
#
# Usage (from the contracts/ folder):
#   export PRIVATE_KEY=0x...   # a TESTNET-ONLY wallet with a little testnet ETH
#   ./script/testnet.sh
set -euo pipefail

RPC="${RPC_URL:-https://rpc.testnet.chain.robinhood.com}"
: "${PRIVATE_KEY:?Set PRIVATE_KEY to a testnet-only wallet key}"
ME=$(cast wallet address --private-key "$PRIVATE_KEY")
HEIR2=0x000000000000000000000000000000000000b0b0   # a second, fake heir
E=1000000000000000000

say() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
deploy() { forge create "$@" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" --broadcast 2>&1 | tee /dev/stderr | grep -i "Deployed to" | awk '{print $3}'; }

say "Chain id: $(cast chain-id --rpc-url "$RPC")   wallet: $ME   balance: $(cast balance "$ME" --ether --rpc-url "$RPC") ETH"

say "1/6 Deploy test token"
TOKEN=$(deploy src/TestBreath.sol:TestBreath)
echo "TestBreath: $TOKEN"

say "2/6 Deploy LastbreathWill (agent = you)"
WILL=$(deploy src/LastbreathWill.sol:LastbreathWill --constructor-args "$TOKEN" "$ME")
echo "LastbreathWill: $WILL"

say "3/6 Fund the treasury with 1000 tBREATH"
cast send "$TOKEN" "transfer(address,uint256)" "$WILL" "$((1000))$(printf '%018d' 0)" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null
echo "freeBalance: $(cast call "$WILL" "freeBalance()(uint256)" --rpc-url "$RPC")   maxPayout: $(cast call "$WILL" "maxPayout()(uint256)" --rpc-url "$RPC")"

say "4/6 Build a will: you 700, heir2 200 (same leaf format as the agent)"
A1=700$(printf '%018d' 0); A2=200$(printf '%018d' 0)
leaf() { cast keccak "$(cast keccak "$(cast abi-encode 'f(address,uint256)' "$1" "$2")")"; }
L1=$(leaf "$ME" "$A1"); L2=$(leaf "$HEIR2" "$A2")
if [[ "${L1,,}" < "${L2,,}" ]]; then ROOT=$(cast keccak "0x${L1#0x}${L2#0x}"); else ROOT=$(cast keccak "0x${L2#0x}${L1#0x}"); fi
echo "root: $ROOT"
cast send "$WILL" "settle(bytes32,uint256,string)" "$ROOT" "900$(printf '%018d' 0)" "testnet" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null
echo "generation now: $(cast call "$WILL" "currentGeneration()(uint256)" --rpc-url "$RPC")   locked: $(cast call "$WILL" "locked()(uint256)" --rpc-url "$RPC")"

say "5/6 Claim your 700"
BEFORE=$(cast call "$TOKEN" "balanceOf(address)(uint256)" "$ME" --rpc-url "$RPC")
cast send "$WILL" "claim(uint256,address,uint256,bytes32[])" 1 "$ME" "$A1" "[$L2]" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null
AFTER=$(cast call "$TOKEN" "balanceOf(address)(uint256)" "$ME" --rpc-url "$RPC")
echo "balance before: $BEFORE"
echo "balance after:  $AFTER"

say "6/6 Safety checks (both must FAIL)"
if cast send "$WILL" "claim(uint256,address,uint256,bytes32[])" 1 "$ME" "$A1" "[$L2]" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
  echo "❌ second claim was accepted (should not happen)"; exit 1; else echo "✅ second claim refused"; fi
if cast send "$WILL" "claim(uint256,address,uint256,bytes32[])" 1 "$HEIR2" "999$(printf '%018d' 0)" "[$L1]" --rpc-url "$RPC" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
  echo "❌ fake amount was accepted (should not happen)"; exit 1; else echo "✅ fake amount refused"; fi

say "Done. Explorer: https://explorer.testnet.chain.robinhood.com/address/$WILL"
