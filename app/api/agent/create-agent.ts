import { getLangChainTools } from '@coinbase/agentkit-langchain';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { prepareAgentkitAndWalletProvider } from './prepare-agentkit';
import { AddLiquidityTool } from '@/app/agent/tools/addLiquidityTool';
import { ApproveTokensTool } from '@/app/agent/tools/approveTokensTool';
import { CheckNativeBalanceTool } from '@/app/agent/tools/checkNativeBalanceTool';
import { CheckTokenBalanceTool } from '@/app/agent/tools/checkTokenBalanceTool';
import { SwapTokensTool } from '@/app/agent/tools/swapTokensTool';

/**
 * Agent Configuration Guide
 *
 * This file handles the core configuration of your AI agent's behavior and capabilities.
 *
 * Key Steps to Customize Your Agent:
 *
 * 1. Select your LLM:
 *    - Modify the `ChatOpenAI` instantiation to choose your preferred LLM
 *    - Configure model parameters like temperature and max tokens
 *
 * 2. Instantiate your Agent:
 *    - Pass the LLM, tools, and memory into `createReactAgent()`
 *    - Configure agent-specific parameters
 */

// === Known Tokens Mapping ===
const KNOWN_TOKENS = {
  EURC: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

// === Agent Singleton ===
let agent: ReturnType<typeof createReactAgent>;

/**
 * Initializes and returns an instance of the AI agent.
 * If an agent instance already exists, it returns the existing one.
 *
 * @function getOrInitializeAgent
 * @returns {Promise<ReturnType<typeof createReactAgent>>} The initialized AI agent.
 *
 * @description Handles agent setup
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function createAgent(): Promise<
  ReturnType<typeof createReactAgent>
> {
  if (agent) return agent;

  try {
    const { agentkit, walletProvider } =
      await prepareAgentkitAndWalletProvider();
    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0,
      timeout: 60000, // 60 seconds, prevent infinite hanging if OpenAI API is slow
    });

    const toolsFromAgentKit = await getLangChainTools(agentkit);
    const tools = [
      ...toolsFromAgentKit,
      AddLiquidityTool,
      ApproveTokensTool,
      CheckNativeBalanceTool,
      CheckTokenBalanceTool,
      SwapTokensTool,
    ];
    const memory = new MemorySaver();

    const canUseFaucet =
      walletProvider.getNetwork().networkId == 'base-sepolia';
    const faucetMessage = `If you ever need funds, you can request them from the faucet.`;
    const cantUseFaucetMessage = `If you need funds, you can provide your wallet details and request funds from the user.`;

    agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      prompt: `
        You are a helpful onchain DeFi agent operating on Base Mainnet via Coinbase AgentKit.

        Tool Usage Policy:
        - You MUST always use a tool if one is available to answer the user request.
        - NEVER fabricate answers or guess token balances.
        - If you lack sufficient information, call the appropriate tool.

        Balance Rules:
        - For ETH balance requests, use the 'check_native_balance' tool.
        - For ERC20 balances (EURC, USDC), use the 'check_token_balance' tool.
        - EURC address: 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42
        - USDC address: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
        - If token is unknown, politely ask the user to provide the token contract address.
        - Wait for the tool response before replying.

        Swap Rules:
        - If the user says "swap X EURC to USDC" or similar:
          - Call the 'swap_tokens' tool.
          - Convert human-readable amounts to token decimals:
            - EURC and USDC have 6 decimals.
            - Multiply by 10^6.
          - If no minAmountOut is provided, set it to 0.

        Response Behavior:
        - Respond concisely and based on actual tool results.
        - If a tool fails (5xx error), suggest the user retry later.
        - Never proceed without tool confirmation.

        ${
          canUseFaucet
            ? 'If needed, you can also recommend the user request funds from the faucet.'
            : 'If needed, suggest the user provide a wallet address for fund requests.'
        }
              `.trim(),
    });

    return agent;
  } catch (error) {
    console.error('Error initializing agent:', error);
    throw new Error('Failed to initialize agent');
  }
}
