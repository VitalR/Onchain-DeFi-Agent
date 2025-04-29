import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const ERC20_ABI = [
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
];

export async function POST(req: Request) {
  try {
    const { tokenAddress } = await req.json();

    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'Missing tokenAddress' },
        { status: 400 }
      );
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.ALCHEMY_API_KEY_MAINNET_URL!),
    });

    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'decimals',
      args: [],
    });

    return NextResponse.json({ decimals });
  } catch (error: any) {
    console.error('Fetch token decimals error:', error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
