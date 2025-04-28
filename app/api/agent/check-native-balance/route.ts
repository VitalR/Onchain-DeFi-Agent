import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { formatUnits } from "viem";

export async function POST() {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.ALCHEMY_API_KEY_MAINNET_URL!)
    });

    const walletAddress = "0xdF1C7676c27a35cf460c350BDF7Fe90123109b1D";

    const ethBalanceBigInt = await publicClient.getBalance({ address: walletAddress });
    const ethBalance = formatUnits(ethBalanceBigInt, 18);

    return NextResponse.json({ balance: ethBalance });
  } catch (error: any) {
    console.error("Native Balance API error:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
