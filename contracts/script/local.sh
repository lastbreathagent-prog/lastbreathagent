#!/usr/bin/env bash
# Same end-to-end test as testnet.sh, but on a local copy of Robinhood Chain (anvil).
# No faucet needed: anvil gives the test wallet 10,000 fake ETH.
#
#   ./script/local.sh                          # plain local chain
#   FORK_URL=<your Alchemy testnet URL> ./script/local.sh   # local copy of the real testnet
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=8545
ANVIL_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil's public test key #0

if [[ -n "${FORK_URL:-}" ]]; then
  echo "Starting anvil as a fork of $FORK_URL ..."
  anvil --port $PORT --fork-url "$FORK_URL" --silent &
  EXPECT=$(cast chain-id --rpc-url "$FORK_URL")
else
  echo "Starting a plain local anvil chain ..."
  anvil --port $PORT --silent &
  EXPECT=31337
fi
ANVIL_PID=$!
trap 'kill $ANVIL_PID 2>/dev/null || true' EXIT

for i in $(seq 1 30); do cast chain-id --rpc-url http://127.0.0.1:$PORT >/dev/null 2>&1 && break; sleep 1; done

RPC_URL=http://127.0.0.1:$PORT PRIVATE_KEY=$ANVIL_KEY EXPECT_CHAIN=$EXPECT ./script/testnet.sh
