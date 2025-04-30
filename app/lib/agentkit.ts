import { prepareAgentkitAndWalletProvider } from '../api/agent/prepare-agentkit';
import { encodeFunctionData } from 'viem';

// Cache the client instances
let cachedAgentKit: any = null;
let cachedWalletProvider: any = null;
let cachedClient: any = null;

/**
 * Get a client instance for interacting with the blockchain
 */
export async function getClient() {
  if (cachedClient) return cachedClient;

  try {
    const { agentkit, walletProvider } =
      await prepareAgentkitAndWalletProvider();
    cachedAgentKit = agentkit;
    cachedWalletProvider = walletProvider;

    const walletAddress = await walletProvider.getAddress();

    const client = {
      sendOnchainAction: async ({
        contractAddress,
        abi,
        functionName,
        args,
      }: {
        contractAddress: string;
        abi: any;
        functionName: string;
        args: any[];
      }) => {
        const data = encodeFunctionData({
          abi,
          functionName,
          args,
        });

        console.log('Sending transaction:', {
          to: contractAddress,
          data,
        });

        const txHash = await walletProvider.sendTransaction({
          to: contractAddress,
          data,
        });

        console.log('Transaction sent:', txHash);
        return txHash;
      },

      readContract: async (params: any) => {
        console.log('Reading contract:', params);
        return await walletProvider.readContract(params);
      },

      getAddress: async () => {
        return { address: walletAddress };
      },

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
