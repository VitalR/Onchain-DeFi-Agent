import { AgentTool } from "@coinbase/agentkit";

export const CheckNativeBalanceTool: AgentTool = {
  name: "check_native_balance",
  description: "Checks the agent's native ETH balance on Base Mainnet.",
  type: "function",
  function: {
    name: "check_native_balance",
    description: "Fetches the native ETH balance on Base Mainnet.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  run: async () => {
    const res = await fetch("/api/agent/check-native-balance", { method: "GET" });

    if (!res.ok) {
      throw new Error("Failed to fetch ETH balance.");
    }

    const data = await res.json();
    return `Your ETH balance: ${data.balances.ETH} ETH (Wallet: ${data.walletAddress})`;
  },
};
