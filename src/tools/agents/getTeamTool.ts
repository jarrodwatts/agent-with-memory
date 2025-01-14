import { agents, ceoAgentId } from "../../index.js";
import { ToolConfig } from "../allTools.js";

interface GetTeamArgs {}

export const getTeamTool: ToolConfig<GetTeamArgs> = {
    definition: {
        type: "function",
        function: {
            name: "get_team_structure",
            description: "Retrieves the organizational structure of the AI agents",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    handler: async (args: GetTeamArgs) => {
        try {
            return formatTeamStructure(ceoAgentId);
        } catch (error) {
            console.error(`Error getting team structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
};

function formatTeamStructure(assistantId: string, depth = 0): string {
    const agent = agents[assistantId];
    if (!agent) return "";

    const indent = "  ".repeat(depth);
    let output = `${indent}${agent.assistant.id} - ${agent.assistant.name}\n`;

    // Find and sort subordinates
    const subordinates = Object.values(agents)
        .filter(a => a.metadata.managerAssistantId === agent.assistant.id)
        .map(a => a.assistant.id)
        .sort(); // Sort by assistant ID for consistent ordering

    // Recursively format each subordinate
    for (const subordinateId of subordinates) {
        output += formatTeamStructure(subordinateId, depth + 1);
    }

    return output;
} 