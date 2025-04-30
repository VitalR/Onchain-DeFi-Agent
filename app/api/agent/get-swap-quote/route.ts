import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Aerodrome Router ABI fragment for getting quotes
const QUOTER_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn', type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'bool', name: 'stable', type: 'bool' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
    ],
    name: 'getAmountOut',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// Aerodrome Quoter address on Base
const QUOTER_ADDRESS = '0x3EF68D3f7664b2805D4E88381b64868a56f88bC4';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenInAddress, tokenOutAddress, amountIn } = body;

    if (!tokenInAddress || !tokenOutAddress || !amountIn) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.ALCHEMY_API_KEY_MAINNET_URL!),
    });

    // For stableswap pairs, we need to determine if the pair is stable or volatile
    // For simplicity, we'll try both and return the better rate
    // In a production environment, you'd query the factory to determine the correct pool type

    // Try as volatile pair (stable=false)
    let amountOut;
    try {
      amountOut = await publicClient.readContract({
        address: QUOTER_ADDRESS as `0x${string}`,
        abi: QUOTER_ABI,
        functionName: 'getAmountOut',
        args: [
          tokenInAddress as `0x${string}`,
          tokenOutAddress as `0x${string}`,
          false, // volatile pool
          BigInt(amountIn),
        ],
      });
    } catch (volatileError) {
      console.log('Volatile pool quote failed:', volatileError);

      // Try as stable pair (stable=true)
      try {
        amountOut = await publicClient.readContract({
          address: QUOTER_ADDRESS as `0x${string}`,
          abi: QUOTER_ABI,
          functionName: 'getAmountOut',
          args: [
            tokenInAddress as `0x${string}`,
            tokenOutAddress as `0x${string}`,
            true, // stable pool
            BigInt(amountIn),
          ],
        });
      } catch (stableError) {
        console.error('Both quote attempts failed:', stableError);
        throw new Error('Failed to get quote for this token pair');
      }
    }

    return NextResponse.json({
      amountOut: amountOut.toString(),
      tokenIn: tokenInAddress,
      tokenOut: tokenOutAddress,
      amountIn,
    });
  } catch (error: any) {
    console.error('Swap Quote Error:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Failed to get quote' },
      { status: 500 }
    );
  }
}
