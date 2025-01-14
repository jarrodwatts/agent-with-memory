import OpenAI from "openai";
import { agents } from "../../index.js";
import { ToolConfig } from "../allTools.js";
import { createThread } from "../../openai/createThread.js";
import { createAssistant } from "../../openai/createAssistant.js";

// Singleton OpenAI client instance
const openaiClient = new OpenAI();

interface CreateAgentArgs {
    agentName: string;
    systemPrompt: string;
    initialMessage: string;
    assistantId: string;
}

export const createAgentTool: ToolConfig<CreateAgentArgs> = {
    definition: {
        type: "function",
        function: {
            name: "create_agent",
            description: "Creates a new AI agent with specified parameters and delegates a task to it",
            parameters: {
                type: "object",
                properties: {
                    agentName: {
                        type: "string",
                        description: "The name/role of the agent to create (e.g., 'CTO', 'Marketing Manager')"
                    },
                    systemPrompt: {
                        type: "string",
                        description: "The system prompt that defines the agent's role and behavior"
                    },
                    assistantId: {
                        type: "string",
                        description: "The OpenAI Assistant ID of the manager (use your own assistant.id, not your name)"
                    }
                },
                required: ["agentName", "systemPrompt", "assistantId"]
            }
        }
    },
    handler: async (args: CreateAgentArgs) => {
        try {
            // Create an agent and a thread
            const assistant = await createAssistant(openaiClient, args.agentName, args.systemPrompt);
            const thread = await createThread(openaiClient);

            // Check if manager exists
            const manager = agents[args.assistantId];
            if (!manager) {
                throw new Error(`Manager agent with ID ${args.assistantId} not found`);
            }

            // Create the new agent entry
            agents[assistant.id] = {
                assistant: assistant,
                threads: {
                    [args.assistantId]: thread // Initialize with just the thread to the manager
                },
                metadata: {
                    managerAssistantId: args.assistantId,
                    subordinateAssistantIds: []
                }
            };

            // Update manager's subordinates list
            manager.metadata.subordinateAssistantIds.push(assistant.id);

            return assistant;
        } catch (error) {
            console.error(`Error creating agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
};