import { NextResponse } from "next/server";
import { getClient } from "@/lib/agentkit";

const EURC_ADDRESS = "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ROUTER_ADDRESS = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";

const ERC20_ABI = [
  {
    "name": "approve",
    "type": "function",
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "stateMutability": "nonpayable"
  }
];

const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

export async function POST() {
  try {
    const client = await getClient();

    // Approve EURC
    await client.sendOnchainAction({
      chainId: 8453,
      contractAddress: EURC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ROUTER_ADDRESS, MAX_UINT256]
    });

    // Approve USDC
    await client.sendOnchainAction({
      chainId: 8453,
      contractAddress: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ROUTER_ADDRESS, MAX_UINT256]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Approval Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
