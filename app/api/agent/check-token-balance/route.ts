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
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  }
];

const KNOWN_TOKENS: Record<string, `0x${string}`> = {
  "EURC": "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
  "USDC": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let tokenIdentifier = body.tokenAddress;

    if (!tokenIdentifier) {
      return NextResponse.json({ error: "Missing tokenAddress in request body" }, { status: 400 });
    }

    // Resolve by symbol or direct address
    const resolvedAddress = KNOWN_TOKENS[tokenIdentifier.toUpperCase()] || tokenIdentifier;

    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.ALCHEMY_API_KEY_MAINNET_URL!),
    });

    const walletAddress = "0xdF1C7676c27a35cf460c350BDF7Fe90123109b1D";

    // Fetch token decimals dynamically
    const decimalsRaw = await publicClient.readContract({
      address: resolvedAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "decimals",
      args: [],
    });

    const decimals = Number(decimalsRaw);

    // Fetch token balance
    const balanceRaw = await publicClient.readContract({
      address: resolvedAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    });

    const balanceFormatted = formatUnits(BigInt(balanceRaw.toString()), decimals);

    return NextResponse.json({
      balance: balanceFormatted,
    });
  } catch (error: any) {
    console.error("Token balance fetch error:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
