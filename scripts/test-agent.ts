import fetch from "node-fetch";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function testNativeBalance() {
  try {
    console.log("Testing native ETH balance fetch...");

    const res = await fetch(`${SITE_URL}/api/agent/check-native-balance`, {
      method: "POST",
    });

    if (!res.ok) {
      console.error("❌ Failed to fetch native balance:", res.status, await res.text());
      return;
    }

    const data = await res.json();
    console.log("✅ Native ETH balance:", data.balance);
  } catch (error) {
    console.error("❌ Error in testNativeBalance:", error);
  }
}

async function testTokenBalance(tokenAddress: string, tokenName: string) {
  try {
    console.log(`Testing ERC20 token balance fetch for ${tokenName}...`);

    const res = await fetch(`${SITE_URL}/api/agent/check-token-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenAddress }),
    });

    if (!res.ok) {
      console.error(`❌ Failed to fetch ${tokenName} balance:`, res.status, await res.text());
      return;
    }

    const data = await res.json();
    console.log(`✅ ${tokenName} balance:`, data.balance);
  } catch (error) {
    console.error(`❌ Error in testTokenBalance for ${tokenName}:`, error);
  }
}

async function main() {
  console.log("\n=== Starting local agent tests ===\n");

  await testNativeBalance();

  await testTokenBalance("0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42", "EURC");
  await testTokenBalance("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "USDC");
  await testTokenBalance("0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", "USDT");

  console.log("\n=== Local agent tests completed ===\n");
}

main();


// npx tsx scripts/test-agent.ts
