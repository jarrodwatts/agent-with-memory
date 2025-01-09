import 'dotenv/config';
import OpenAI from "openai";
import readline from 'readline';
import { createAssistant } from './openai/createAssistant.js';
import { createThread } from './openai/createThread.js';
import { createRun } from './openai/createRun.js';
import { performRun } from './openai/performRun.js';
import { Thread } from 'openai/resources/beta/threads/threads';
import { Assistant } from 'openai/resources/beta/assistants';
import supabase from './supabase/initSupabaseClient.js';
import storeMessage, { MessageStore } from './supabase/storeMessage.js';
import searchSimilarMessages from './supabase/search.js';

export const client = new OpenAI();

// Create interface for reading from command line
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Type-safe promise-based question function
const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function chat(thread: Thread, assistant: Assistant): Promise<void> {
    while (true) {
        const userInput = await question('\nYou: ');

        if (userInput.toLowerCase() === 'exit') {
            rl.close();
            break;
        }

        try {
            // Search for relevant context before responding
            const similarMessages = await searchSimilarMessages(supabase, userInput);
            let contextPrompt = '';
            
            if (similarMessages.data && similarMessages.data.length > 0) {
                contextPrompt = `Previous relevant context:\n${similarMessages.data
                    .map((msg: MessageStore) => `${msg.role}: ${msg.content}`)
                    .join('\n')}\n\nGiven this context, please respond to: ${userInput}`;
            }

            // Add the user's message to the thread
            const userMessage = await client.beta.threads.messages.create(thread.id, {
                role: "user",
                content: contextPrompt || userInput
            });

            // Store user message
            await storeMessage(supabase, {
                assistant_id: assistant.id,
                thread_id: thread.id,
                message_id: userMessage.id,
                content: userInput, // Store original input, not the context-enhanced version
                role: 'user'
            });

            // Create and perform the run
            const run = await createRun(client, thread, assistant.id);
            const result = await performRun(run, client, thread);

            if (result?.type === 'text') {
                console.log('\nAlt:', result.text.value);

                // Store assistant message
                await storeMessage(supabase, {
                    assistant_id: assistant.id,
                    thread_id: thread.id,
                    run_id: run.id,
                    message_id: (await client.beta.threads.messages.list(thread.id)).data[0].id,
                    content: result.text.value,
                    role: 'assistant',
                    tool_calls: run.required_action?.submit_tool_outputs?.tool_calls
                });
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
        const assistant = await createAssistant(client);
        const thread = await createThread(client);

        console.log('Chat started! Type "exit" to end the conversation.');
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
