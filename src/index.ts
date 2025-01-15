import 'dotenv/config';
import OpenAI from "openai";
import readline from 'readline';
import { createRun } from './openai/createRun.js';
import { performRun } from './openai/performRun.js';
import { Thread } from 'openai/resources/beta/threads/threads';
import { Assistant } from 'openai/resources/beta/assistants';
import { Agent } from './types/Agent.js';
import { createAssistant } from './openai/createAssistant.js';
import { createThread } from './openai/createThread.js';
import storeMessage from './supabase/storeMessage.js';
import supabase from './supabase/initSupabaseClient.js';

// Simple in-memory store for agents and their threads
export const agents: Record<string, Agent> = {};
export let ceoAgentId: string;

// Create OpenAI client
export const client = new OpenAI();

// Use rl for simple chat interface reading from command line to communicate to CEO agent
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get the value you ask the CEO agent from the command line input.
const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

// Core loop: Chat repeatedly asks the user for their next question to the CEO agent
// Until the user types "exit" or just kills the process
async function chat(thread: Thread, assistant: Assistant): Promise<void> {
    while (true) {

        // Get the input from the user via command line.
        const userInput = await question('\nYou: ');

        // If the user types "exit", close the chat and break the loop to exit the program
        if (userInput.toLowerCase() === 'exit') {
            rl.close();
            break;
        }

        try {
            // Add user's input as a message to thread with the CEO agent
            const message = await client.beta.threads.messages.create(thread.id, {
                role: "user",
                content: userInput,
            });

            // Handle the message request by creating a new run
            const run = await createRun(client, thread, assistant.id, userInput);

            // Handle the run (and perform tool requests) and get the resulting response from the CEO.
            const result = await performRun(run, client, thread, "USER");

            // Store message
            await storeMessage(supabase, {
                sender_id: "USER",
                receiver_id: assistant.id,
                content: userInput,
                message_id: message.id,
                thread_id: thread.id,
                role: "user"
            })

            // Display the CEO agent's response
            if (result?.type === 'text') {
                console.log(`\nCEO: ${result.text.value}`);
            }

        } catch (error) {
            console.error('Error during chat:', error instanceof Error ? error.message : 'Unknown error');
            rl.close();
            break;
        }
    }
}

async function main(): Promise<void> {
    try {
        console.log('Chat started! Type your first message to the CEO:');

        // Create the initial CEO agent with a simple system prompt
        const assistant = await createAssistant(
            client,
            "CEO",
            "You are the CEO of a company. You are responsible for making decisions about the company."
        );

        // Create a thread to send messages to the CEO agent and vice versa
        const thread = await createThread(client);

        // Add the CEO agent to the agents object
        agents[assistant.id] = {
            assistant: assistant,
            threads: {
                [assistant.id]: thread
            },
            metadata: {
                managerAssistantId: null,
                subordinateAssistantIds: []
            }
        };
        ceoAgentId = assistant.id;

        // Start the chat loop
        await chat(thread, assistant);

    } catch (error) {
        console.error('Error in main:', error instanceof Error ? error.message : 'Unknown error');
        rl.close();
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Unhandled error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
});
