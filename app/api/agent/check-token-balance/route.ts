import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { formatUnits } from 'viem';

const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export async function POST(request: Request) {
  try {
    const { tokenAddress } = await request.json();

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

    const walletAddress = '0xdF1C7676c27a35cf460c350BDF7Fe90123109b1D';

    const decimalsRaw = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
      args: [],
    });

    const decimals = Number(decimalsRaw);

    const balanceRaw = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    });

    const balanceFormatted = formatUnits(balanceRaw, decimals);

    return NextResponse.json({ balance: balanceFormatted });
  } catch (error: any) {
    console.error('[check-token-balance] Error:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
