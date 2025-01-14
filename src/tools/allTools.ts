import { createAgentTool } from "./agents/createAgentTool.js";
import { getTeamTool } from "./agents/getTeamTool.js";
import { sendMessageTool } from "./agents/sendMessageTool.js";
import { getBalanceTool } from "./getBalance.js";
import { getWalletAddressTool } from "./getWalletAddress.js";

export interface ToolConfig<T = any> {
    definition: {
        type: 'function';
        function: {
            name: string;
            description: string;
            parameters: {
                type: 'object';
                properties: Record<string, unknown>;
                required: string[];
            };
        };
    };
    handler: (args: T) => Promise<any>;
}

export const tools: Record<string, ToolConfig> = {
    // Onchain actions
    get_wallet_address: getWalletAddressTool,
    get_balance: getBalanceTool,

    // Agent management
    create_agent: createAgentTool,  
    get_team_structure: getTeamTool,
    send_message_to_agent: sendMessageTool,
};