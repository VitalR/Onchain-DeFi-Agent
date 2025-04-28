import { AgentTool } from "@coinbase/agentkit";

export const CheckNativeBalanceTool: AgentTool = {
  name: "check_native_balance",
  description: "Checks the agent's native ETH balance.",
  type: "function",
  function: {
    name: "check_native_balance",
    description: "Fetches native ETH balance.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  run: async () => {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/agent/check-native-balance`;

    const res = await fetch(url, { method: "POST" });

    if (!res.ok) {
      throw new Error("Failed to fetch ETH balance.");
    }

    const data = await res.json();
    return `Your ETH balance: ${data.balance} ETH`;
  },
};
