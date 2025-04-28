import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { prepareAgentkitAndWalletProvider } from "./prepare-agentkit";
import { AddLiquidityTool } from "@/app/agent/tools/addLiquidityTool";
import { ApproveTokensTool } from "@/app/agent/tools/approveTokensTool";
import { CheckNativeBalanceTool } from "@/app/agent/tools/checkNativeBalanceTool";
import { CheckTokenBalanceTool } from "@/app/agent/tools/checkTokenBalanceTool";

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

// The agent
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
export async function createAgent(): Promise<ReturnType<typeof createReactAgent>> {
  // If agent has already been initialized, return it
  if (agent) {
    return agent;
  }

  try {
    const { agentkit, walletProvider } = await prepareAgentkitAndWalletProvider();

    // Initialize LLM: https://platform.openai.com/docs/models#gpt-4o
    const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

    // const tools = await getLangChainTools(agentkit);
    const toolsFromAgentKit = await getLangChainTools(agentkit);
    const tools = [...toolsFromAgentKit, AddLiquidityTool, ApproveTokensTool, CheckNativeBalanceTool, CheckTokenBalanceTool,];

    const memory = new MemorySaver();

    // Initialize Agent
    const canUseFaucet = walletProvider.getNetwork().networkId == "base-sepolia";
    const faucetMessage = `If you ever need funds, you can request them from the faucet.`;
    const cantUseFaucetMessage = `If you need funds, you can provide your wallet details and request funds from the user.`;
    agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
        empowered to interact onchain using your tools. ${canUseFaucet ? faucetMessage : cantUseFaucetMessage}.
        Before executing your first action, get the wallet details to see what network 
        you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone 
        asks you to do something you can't do with your currently available tools, you must say so, and 
        encourage them to implement it themselves using the CDP SDK + Agentkit, recommend they go to 
        docs.cdp.coinbase.com for more information. 
        Be concise and helpful with your responses. 
        Refrain from restating your tools' descriptions unless it is explicitly requested.

        Always follow these strict rules:
        - When asked about ETH balance, immediately use the 'check_native_balance' tool.
        - When asked about any ERC20 token (e.g., EURC, USDC, stablecoins), immediately use the 'check_token_balance' tool.

        Known tokens are:
        - EURC => 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42
        - USDC => 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        
        - If the token is unknown (not pre-listed), inform the user politely:
        "I can't check your [TOKEN] balance automatically. However, if you provide the token's contract address, I can fetch the balance for you."
        - Do not guess or create fake answers.
        - Do not ask users for token addresses for EURC or USDC.

        Always run the correct function based on user’s token names. Do not engage in conversation instead of function calling.
        Be concise.
        `,
    });

    return agent;
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}
