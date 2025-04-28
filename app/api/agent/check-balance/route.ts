import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { formatUnits } from "viem";
import { encodeFunctionData } from "viem";

const TOKENS = {
  EURC: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
];

export async function GET() {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.ALCHEMY_API_KEY_MAINNET_URL!)
    });

    const walletAddress = "0xdF1C7676c27a35cf460c350BDF7Fe90123109b1D";

    // Native ETH balance
    const ethBalanceBigInt = await publicClient.getBalance({ address: walletAddress });
    const ethBalance = formatUnits(ethBalanceBigInt, 18);

    // ERC20 Balances via multicall
    const multicallData = Object.entries(TOKENS).map(([_, tokenAddress]) => ({
      address: tokenAddress as `0x${string}`,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress],
      }),
    }));

    const results = await publicClient.multicall({
      contracts: multicallData,
      allowFailure: true,
    });

    const balances: Record<string, string> = {};
    Object.keys(TOKENS).forEach((symbol, index) => {
      const result = results[index];
      if (result.status === "success") {
        balances[symbol] = formatUnits(BigInt(result.result as bigint), 6);
      } else {
        console.error(`Multicall failed for ${symbol}`);
        balances[symbol] = "0.00";
      }
    });

    return NextResponse.json({
      walletAddress,
      balances: {
        ETH: ethBalance,
        ...balances
      }
    });
  } catch (error: any) {
    console.error("Balance API error:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

