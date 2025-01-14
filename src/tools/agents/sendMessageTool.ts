import OpenAI from "openai";
import { agents } from "../../index.js";
import { createRun } from "../../openai/createRun.js";
import { performRun } from "../../openai/performRun.js";
import { ToolConfig } from "../allTools.js";
import { createThread } from "../../openai/createThread.js";
import supabase from "../../supabase/initSupabaseClient.js";
import storeMessage from "../../supabase/storeMessage.js";

const openaiClient = new OpenAI();

interface SendMessageArgs {
    recipientAgent: string;
    message: string;
    assistantId: string;
}

export const sendMessageTool: ToolConfig<SendMessageArgs> = {
    definition: {
        type: "function",
        function: {
            name: "send_message_to_agent",
            description: "Sends a message to an existing AI agent and gets their response",
            parameters: {
                type: "object",
                properties: {
                    recipientAgent: {
                        type: "string",
                        description: "The OpenAI Assistant ID (NOT the name)! of the agent to send the message to (must be an existing agent). This is the assistant.id of the agent you want to send the message to."
                    },
                    message: {
                        type: "string",
                        description: "The message to send to the agent"
                    },
                    assistantId: {
                        type: "string",
                        description: "The OpenAI Assistant ID (NOT the name)! of the manager (use your own assistant.id, not your name)"
                    }
                },
                required: ["recipientAgent", "message", "assistantId"]
            }
        }
    },
    handler: async (args: SendMessageArgs) => {
        try {
            // Validate both agents exist before proceeding
            const sendingAgent = agents[args.assistantId];
            const receivingAgent = agents[args.recipientAgent];

            if (!sendingAgent) {
                throw new Error(`Sending agent "${args.assistantId}" not found`);
            }

            if (!receivingAgent) {
                throw new Error(`Receiving agent "${args.recipientAgent}" not found`);
            }

            console.log(`Sending agent: ${sendingAgent.assistant.id}`);
            console.log(`Receiving agent: ${receivingAgent.assistant.id}`);

            console.log('Available agents:', Object.keys(agents));
            console.log('Full agents object:', JSON.stringify(agents, null, 2));

            // If no thread exists between the sender agent and the receiving agent, create one for them to communicate on
            let agentsThread = receivingAgent.threads[sendingAgent.assistant.id] || sendingAgent.threads[receivingAgent.assistant.id];
            if (!agentsThread) {
                agentsThread = await createThread(openaiClient);
                receivingAgent.threads[sendingAgent.assistant.id] = agentsThread;
                sendingAgent.threads[receivingAgent.assistant.id] = agentsThread;
            }

            // Create and perform the run with the message
            const message = await openaiClient.beta.threads.messages.create(agentsThread.id, {
                role: "user",
                content: args.message
            });

            // Store message
            await storeMessage(supabase, {
                sender_id: sendingAgent.assistant.id,
                receiver_id: receivingAgent.assistant.id,
                content: args.message,
                message_id: message.id,
                thread_id: agentsThread.id,
                role: "user"
            });

            // Create the run after adding the message
            const run = await createRun(
                openaiClient,
                agentsThread, // Use the thread between the two agents
                receivingAgent.assistant.id, // The assistant receiving the message performs the run
                args.message // What the sender agent is sending to the receiving agent (will be enhanced with context)
            );

            // Perform the run and get the result
            const result = await performRun(run, 
                openaiClient, 
                agentsThread, // Use the thread between the two agents
                sendingAgent.assistant.id // Now, the agent who gets the response back (the original sender) is the recipient for db purposes.
            );

            // Return the agent's response as the final output to complete this tool call of sending message.
            if ('text' in result) {
                return `${args.recipientAgent} responds: ${result.text.value}`;
            }
            return `${args.recipientAgent} responded (non-text response)`;

        } catch (error) {
            return `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
}; 