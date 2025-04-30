import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const KNOWN_TOKENS: Record<string, `0x${string}`> = {
  EURC: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

export const SwapTokensTool = new DynamicStructuredTool({
  name: 'swap_tokens',
  description: 'Swaps tokens using the Aerodrome Router on Base Mainnet.',
  schema: z.object({
    tokenInName: z
      .string()
      .describe('The symbol or address of the token being swapped from.'),
    tokenOutName: z
      .string()
      .describe('The symbol or address of the token being swapped to.'),
    amountInHuman: z
      .string()
      .describe("The amount to swap (in human-readable form, e.g., '5')."),
    minAmountOutHuman: z
      .string()
      .optional()
      .describe('The minimum acceptable output amount (optional).'),
    maxApprove: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Whether to approve maximum (unlimited) amount instead of just the swap amount.'
      ),
  }),
  func: async ({
    tokenInName,
    tokenOutName,
    amountInHuman,
    minAmountOutHuman,
    maxApprove = false,
  }) => {
    const tokenInAddress =
      KNOWN_TOKENS[tokenInName.toUpperCase()] || tokenInName;
    const tokenOutAddress =
      KNOWN_TOKENS[tokenOutName.toUpperCase()] || tokenOutName;
    const baseUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/agent`;

    try {
      // 1. Fetch token decimals for input token
      const inDecimalsRes = await fetch(`${baseUrl}/fetch-token-decimals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress: tokenInAddress }),
      });

      if (!inDecimalsRes.ok) {
        const errorBody = await inDecimalsRes.text();
        throw new Error(`Failed to fetch input token decimals: ${errorBody}`);
      }

      const { decimals: inDecimals } = await inDecimalsRes.json();
      if (!inDecimals) {
        throw new Error('Input token decimals not found.');
      }

      // 2. Fetch token decimals for output token
      const outDecimalsRes = await fetch(`${baseUrl}/fetch-token-decimals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress: tokenOutAddress }),
      });

      if (!outDecimalsRes.ok) {
        const errorBody = await outDecimalsRes.text();
        throw new Error(`Failed to fetch output token decimals: ${errorBody}`);
      }

      const { decimals: outDecimals } = await outDecimalsRes.json();
      if (!outDecimals) {
        throw new Error('Output token decimals not found.');
      }

      // 3. Parse amountIn
      const amountInBigInt = BigInt(
        Math.floor(parseFloat(amountInHuman) * 10 ** inDecimals)
      );
      if (amountInBigInt <= BigInt(0)) {
        throw new Error(`Invalid swap amount: ${amountInHuman}`);
      }

      // 4. Parse minAmountOut - using output token decimals
      let minAmountOutBigInt = BigInt(0);
      if (minAmountOutHuman) {
        minAmountOutBigInt = BigInt(
          Math.floor(parseFloat(minAmountOutHuman) * 10 ** outDecimals)
        );
      } else {
        // If no minAmountOut provided, we'll get a quote and apply slippage later
        minAmountOutBigInt = BigInt(0);
      }

      // 5. Check allowance
      const allowanceRes = await fetch(`${baseUrl}/check-allowance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress: tokenInAddress }),
      });

      if (!allowanceRes.ok) {
        const errorBody = await allowanceRes.text();
        throw new Error(`Failed to check allowance: ${errorBody}`);
      }

      const { allowance } = await allowanceRes.json();
      const allowanceBigInt = BigInt(allowance);

      // 6. Approve tokens if necessary
      let approvalStep: {
        needed: boolean;
        token?: string;
        currentAllowance?: string;
        requiredAmount?: string;
        unlimited?: boolean;
        txHash?: string;
        success?: boolean;
        message?: string;
      } = { needed: false };

      if (allowanceBigInt < amountInBigInt) {
        console.log(
          `Allowance (${allowanceBigInt}) < Amount (${amountInBigInt}). Approving tokens...`
        );

        approvalStep = {
          needed: true,
          token: tokenInName.toUpperCase(),
          currentAllowance: allowance,
          requiredAmount: amountInBigInt.toString(),
          unlimited: maxApprove,
        };

        const approveRes = await fetch(`${baseUrl}/approve-tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenAddress: tokenInAddress,
            // If maxApprove is true, don't specify amount to use max
            amount: maxApprove ? undefined : amountInBigInt.toString(),
          }),
        });

        if (!approveRes.ok) {
          const errorBody = await approveRes.text();
          throw new Error(`Failed to approve tokens: ${errorBody}`);
        }

        const approveData = await approveRes.json();
        console.log('Approval result:', approveData);

        approvalStep.txHash = approveData.txHash;
        approvalStep.success = true;

        // Wait for 5 seconds to ensure the approval transaction is processed
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        approvalStep = {
          needed: false,
          message: 'Approval not needed, sufficient allowance exists.',
        };
      }

      // 7. Submit swap with proper slippage
      let finalMinAmountOut = minAmountOutBigInt;

      // If no minAmountOut was provided, apply 1% slippage based on a quote
      if (finalMinAmountOut === BigInt(0)) {
        // Get a quote for the swap
        const quoteRes = await fetch(`${baseUrl}/get-swap-quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenInAddress,
            tokenOutAddress,
            amountIn: amountInBigInt.toString(),
          }),
        });

        if (quoteRes.ok) {
          const { amountOut } = await quoteRes.json();
          if (amountOut) {
            // Apply 1% slippage
            finalMinAmountOut = (BigInt(amountOut) * BigInt(99)) / BigInt(100);
          } else {
            // Default to 1% of input if no quote available
            finalMinAmountOut = (amountInBigInt * BigInt(99)) / BigInt(100);
          }
        } else {
          // Fall back to very minimal slippage protection
          finalMinAmountOut = BigInt(1);
          console.log(
            'Could not get swap quote, using minimal slippage protection'
          );
        }
      }

      // 8. Execute the swap
      const swapRes = await fetch(`${baseUrl}/swap-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenInAddress,
          tokenOutAddress,
          amountIn: amountInBigInt.toString(),
          minAmountOut: finalMinAmountOut.toString(),
        }),
      });

      if (!swapRes.ok) {
        const errorText = await swapRes.text();
        let errorBody;
        try {
          errorBody = JSON.parse(errorText);
        } catch {
          errorBody = { error: errorText };
        }
        throw new Error(
          `Failed to swap tokens: ${errorBody.error || errorText}`
        );
      }

      const swapData = await swapRes.json();

      // Build a detailed response message based on what happened
      let message = '';
      if (approvalStep?.needed) {
        message += `First ${
          maxApprove ? 'approved unlimited' : 'approved'
        } ${tokenInName} for Aerodrome Router. `;
      }
      message += `Successfully swapped ${amountInHuman} ${tokenInName} to ${tokenOutName}.`;

      return {
        status: 'success',
        message,
        approval: approvalStep,
        swap: {
          status: 'success',
          txHash: swapData.txHash,
          amountIn: amountInHuman,
          tokenIn: tokenInName,
          tokenOut: tokenOutName,
        },
      };
    } catch (error: any) {
      console.error('Swap Error:', error.message || error);
      return {
        status: 'error',
        message: `Swap failed: ${error.message || 'Unknown error occurred'}`,
        error: error.message,
      };
    }
  },
});
