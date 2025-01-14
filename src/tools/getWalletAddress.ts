import { Address } from 'viem';
import { createViemWalletClient } from '../viem/createViemWalletClient.js';
import { ToolConfig } from './allTools.js';

// No arguments needed since we're getting the connected wallet
interface GetWalletAddressArgs { }

export const getWalletAddressTool: ToolConfig<GetWalletAddressArgs> = {
    definition: {
        type: 'function',
        function: {
            name: 'get_wallet_address',
            description: 'Get the connected wallet address',
            // No parameters needed since we're getting the connected wallet
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },
    handler: async () => {
        return await getWalletAddress();
    }
};

async function getWalletAddress(): Promise<Address> {
    const walletClient = createViemWalletClient();
    const [address] = await walletClient.getAddresses();
    return address;
}