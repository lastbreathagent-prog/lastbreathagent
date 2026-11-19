#!/usr/bin/env bash
# Deploy LastbreathWill on Robinhood Chain MAINNET for the real $BREATH token.
#
# Usage (from the contracts/ folder):
#   TOKEN=0xYourBreathCA RPC_URL=https://... ./script/deploy-mainnet.sh
# The private key is asked for (hidden), never stored in your shell history.
# AGENT (optional) = the wallet allowed to call settle(); defaults to the deployer.
set -euo pipefail

: "${TOKEN:?Set TOKEN to the \$BREATH contract address (CA)}"
: "${RPC_URL:?Set RPC_URL to a Robinhood Chain mainnet RPC}"
EXPECT="${EXPECT_CHAIN:-4663}"

CHAIN=$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || true)
[[ -z "$CHAIN" ]] && { echo "❌ Cannot reach RPC $RPC_URL"; exit 1; }
[[ "$CHAIN" != "$EXPECT" ]] && { echo "❌ RPC is on chain $CHAIN, expected $EXPECT (Robinhood Chain mainnet)."; exit 1; }

CODE=$(cast code "$TOKEN" --rpc-url "$RPC_URL")
[[ "$CODE" == "0x" ]] && { echo "❌ No contract at TOKEN $TOKEN on this chain. Check the CA."; exit 1; }
SYMBOL=$(cast call "$TOKEN" "symbol()(string)" --rpc-url "$RPC_URL" 2>/dev/null || echo "?")
NAME=$(cast call "$TOKEN" "name()(string)" --rpc-url "$RPC_URL" 2>/dev/null || echo "?")

read -r -s -p "Private key of the deployer wallet (hidden): " PRIVATE_KEY; echo
ME=$(cast wallet address --private-key "$PRIVATE_KEY")
AGENT="${AGENT:-$ME}"
BAL=$(cast balance "$ME" --ether --rpc-url "$RPC_URL")

echo
echo "  Chain:    $CHAIN (Robinhood Chain mainnet)"
echo "  Token:    $TOKEN  ($NAME / $SYMBOL)"
echo "  Deployer: $ME  (balance $BAL ETH)  -> becomes owner"
echo "  Agent:    $AGENT  (allowed to call settle)"
echo
read -r -p "Deploy LastbreathWill with these settings? Type yes: " OK
[[ "$OK" == "yes" ]] || { echo "Cancelled."; exit 1; }

OUT=$(forge create --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast src/LastbreathWill.sol:LastbreathWill --constructor-args "$TOKEN" "$AGENT" 2>&1) || { echo "$OUT"; exit 1; }
echo "$OUT" | grep -iE "Deployed to|Transaction hash"
WILL=$(echo "$OUT" | grep -i "Deployed to" | awk '{print $3}')
unset PRIVATE_KEY

echo
echo "Checking the deployed contract..."
[[ "$(cast call "$WILL" "token()(address)" --rpc-url "$RPC_URL" | tr A-F a-f)" == "$(echo "$TOKEN" | tr A-F a-f)" ]] && echo "✅ token() is \$BREATH" || echo "❌ token() mismatch"
[[ "$(cast call "$WILL" "agent()(address)" --rpc-url "$RPC_URL" | tr A-F a-f)" == "$(echo "$AGENT" | tr A-F a-f)" ]] && echo "✅ agent() is $AGENT" || echo "❌ agent() mismatch"
echo "✅ currentGeneration: $(cast call "$WILL" "currentGeneration()(uint256)" --rpc-url "$RPC_URL")"
echo
echo "LastbreathWill: $WILL"
echo "Send this address to Claude. Fund the treasury by sending \$BREATH to it."
