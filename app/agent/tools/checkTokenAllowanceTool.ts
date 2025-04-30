import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const ROUTER_ADDRESS = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43';

const KNOWN_TOKENS: Record<string, `0x${string}`> = {
  EURC: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

export const CheckTokenAllowanceTool = new DynamicStructuredTool({
  name: 'check_token_allowance',
  description:
    "Checks how much of a token (e.g., EURC or USDC) is currently approved for the Aerodrome Router. Use when the user asks things like 'How much is approved?', 'What's my allowance?', or 'Did I approve EURC for Aerodrome?'",
  type: 'function',
  function: {
    name: 'check_token_allowance',
    description:
      'Check how much of a given ERC20 token is approved for the Aerodrome Router.',
    parameters: {
      type: 'object',
      properties: {
        tokenAddress: {
          type: 'string',
          description: 'ERC20 token address or name (e.g. EURC, USDC)',
        },
      },
      required: ['tokenAddress'],
    },
  },
  schema: z.object({
    tokenAddress: z
      .string()
      .describe('ERC20 token address (e.g. EURC or USDC address)'),
  }),
  func: async ({ tokenAddress }) => {
    const resolvedAddress =
      KNOWN_TOKENS[tokenAddress.toUpperCase()] || tokenAddress;

    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/agent/check-token-allowance`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenAddress: resolvedAddress }),
    });

    if (!res.ok) {
      console.error(
        '[CheckTokenAllowanceTool] Error:',
        res.status,
        await res.text()
      );
      throw new Error('Failed to fetch allowance');
    }

    const data = await res.json();
    return {
      allowance: data.allowance,
      message: `You have approved ${
        data.allowance
      } units of ${tokenAddress.toUpperCase()} for the Aerodrome Router.`,
    };
  },
});
