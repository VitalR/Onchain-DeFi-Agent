import { NextResponse } from 'next/server';
import { getClient } from '@/app/lib/agentkit';

const ROUTER_ADDRESS = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43';

// Aerodrome Router ABI fragment for simple swaps
const ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn', type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokensSimple',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export async function POST(req: Request) {
  try {
    const client = await getClient();
    const body = await req.json();

    const { tokenInAddress, tokenOutAddress, amountIn, minAmountOut } = body;

    // Validate input
    if (!tokenInAddress || !tokenOutAddress || !amountIn) {
      return NextResponse.json(
        { error: 'Missing required swap parameters' },
        { status: 400 }
      );
    }

    console.log(
      `Swap request: ${amountIn} of ${tokenInAddress} to ${tokenOutAddress} with min out ${
        minAmountOut || '0'
      }`
    );

    // Ensure we have bigints for numeric values
    const amountInBigInt = BigInt(amountIn);
    const minAmountOutBigInt = minAmountOut ? BigInt(minAmountOut) : BigInt(0);

    if (amountInBigInt <= BigInt(0)) {
      return NextResponse.json(
        { error: 'Invalid amountIn, must be > 0' },
        { status: 400 }
      );
    }

    const deadline = Math.floor(Date.now() / 1000) + 1800; // +30 minutes

    const { address: smartWalletAddress } = await client.getAddress();
    console.log(`Using wallet address: ${smartWalletAddress}`);

    try {
      const txHash = await client.sendOnchainAction({
        chainId: 8453, // Base Mainnet
        contractAddress: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: 'swapExactTokensForTokensSimple',
        args: [
          tokenInAddress,
          tokenOutAddress,
          amountInBigInt,
          minAmountOutBigInt,
          smartWalletAddress,
          deadline,
        ],
      });

      console.log(`Swap transaction submitted: ${txHash}`);
      return NextResponse.json({
        success: true,
        txHash,
        message: 'Swap transaction submitted',
      });
    } catch (swapError: any) {
      console.error('Swap transaction error:', swapError);
      return NextResponse.json(
        {
          error: swapError.message || 'Failed to execute swap',
          details: swapError.toString(),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Swap Route Error:', {
      error: error.message || error,
      stack: error.stack,
      body: await req.json().catch(() => 'Unable to parse body'),
    });
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
