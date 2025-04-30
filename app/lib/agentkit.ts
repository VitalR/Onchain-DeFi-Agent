import { prepareAgentkitAndWalletProvider } from '../api/agent/prepare-agentkit';

// Cache the client instances to avoid creating new ones for each request
let cachedAgentKit: any = null;
let cachedWalletProvider: any = null;
let cachedClient: any = null;

/**
 * Get a client instance for interacting with the blockchain
 * This provides a consistent client for all API routes
 * @returns A client that can interact with contracts and perform onchain actions
 */
export async function getClient() {
  if (cachedClient) return cachedClient;

  try {
    // Get the real providers from AgentKit
    const { agentkit, walletProvider } =
      await prepareAgentkitAndWalletProvider();

    // Cache these instances
    cachedAgentKit = agentkit;
    cachedWalletProvider = walletProvider;

    // Get the wallet address
    const walletAddress = await walletProvider.getAddress();

    // Create a client with the methods expected by our API routes
    const client = {
      // Method for sending transactions (approve, swap, etc.)
      sendOnchainAction: async (params: any) => {
        console.log('Sending transaction:', params);

        // Call the appropriate action provider for the transaction
        // Use the erc20 action provider for token operations
        const result = await agentkit.executeAction(
          'erc20',
          'send_transaction',
          params
        );

        console.log('Transaction sent:', result);
        return result;
      },

      // Method for reading from contracts
      readContract: async (params: any) => {
        console.log('Reading contract:', params);

        // Use the erc20 action provider for token queries
        return await agentkit.executeAction('erc20', 'read_contract', params);
      },

      // Method for getting wallet address
      getAddress: async () => {
        return { address: walletAddress };
      },

      // Some routes access this property directly
      account: {
        address: walletAddress,
      },
    };

    cachedClient = client;
    return client;
  } catch (error) {
    console.error('Error initializing client:', error);
    throw new Error('Failed to initialize blockchain client');
  }
}
