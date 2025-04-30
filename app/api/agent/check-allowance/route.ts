import { NextResponse } from 'next/server';
import { getClient } from '@/app/lib/agentkit';

const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const ROUTER_ADDRESS = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43';

export async function POST(req: Request) {
  try {
    const client = await getClient();
    const { tokenAddress } = await req.json();
    const { address: smartWalletAddress } = await client.getAddress();

    const allowance = await client.readContract({
      chainId: 8453,
      contractAddress: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [smartWalletAddress, ROUTER_ADDRESS],
    });

    return NextResponse.json({ allowance: allowance.toString() });
  } catch (error: any) {
    console.error('Allowance Check Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
