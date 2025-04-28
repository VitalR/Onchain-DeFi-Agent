import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { formatUnits } from "viem";

const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
];

const KNOWN_TOKENS: Record<string, `0x${string}`> = {
  "EURC": "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
  "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let tokenIdentifier = searchParams.get("tokenAddress");

  if (!tokenIdentifier) {
    return NextResponse.json({ error: "Missing tokenAddress parameter" }, { status: 400 });
  }

  const resolvedAddress = KNOWN_TOKENS[tokenIdentifier.toUpperCase()] || tokenIdentifier;

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.ALCHEMY_API_KEY_MAINNET_URL!),
    });

    const walletAddress = "0xdF1C7676c27a35cf460c350BDF7Fe90123109b1D"; // hardcoded or dynamic later

    const balanceRaw = await publicClient.readContract({
      address: resolvedAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    });

    return NextResponse.json({
      tokenAddress: resolvedAddress,
      balance: formatUnits(BigInt(balanceRaw.toString()), 6),
      symbol: tokenIdentifier,
    });
  } catch (error: any) {
    console.error("Token balance fetch error:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
