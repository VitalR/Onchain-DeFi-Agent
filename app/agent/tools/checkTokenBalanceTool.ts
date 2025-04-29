import { AgentTool } from '@coinbase/agentkit';

const KNOWN_TOKENS: Record<string, `0x${string}`> = {
  EURC: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

export const CheckTokenBalanceTool: AgentTool = {
  name: 'check_token_balance',
  description: 'Fetches ERC20 token balances on Base Mainnet.',
  type: 'function',
  function: {
    name: 'check_token_balance',
    description: 'Fetches ERC20 balance for given tokens.',
    parameters: {
      type: 'object',
      properties: {
        tokenNames: {
          type: 'array',
          items: { type: 'string' },
          description:
            "List of token names (e.g. ['EURC', 'USDC']) or addresses.",
        },
      },
      required: ['tokenNames'],
    },
  },
  run: async (params) => {
    const { tokenNames } = params as { tokenNames: string[] };
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/agent/check-token-balance`;

    const balances: Record<string, string> = {};

    for (const tokenName of tokenNames) {
      const resolved = KNOWN_TOKENS[tokenName.toUpperCase()] || tokenName;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress: resolved }),
      });

      if (!res.ok) {
        console.error(
          `[CheckTokenBalanceTool] Failed for ${tokenName}:`,
          res.status
        );
        balances[tokenName.toUpperCase()] = 'FetchFailed';
        continue;
      }

      const data = await res.json();
      balances[tokenName.toUpperCase()] = data.balance;
    }

    console.log('[CheckTokenBalanceTool] Final balances:', balances);

    return balances; // MUST return an object, NOT a string
  },
};
