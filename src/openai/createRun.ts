import OpenAI from "openai";
import { Run } from "openai/resources/beta/threads/runs/runs";
import { Thread } from "openai/resources/beta/threads/threads";
import { getContextFromSimilaritySearch } from "../supabase/getContextFromSimilaritySearch.js";
import supabase from "../supabase/initSupabaseClient.js";

export async function createRun(client: OpenAI, thread: Thread, assistantId: string, userInput: string): Promise<Run> {
    console.log(`🎬 Creating run for thread ${thread.id} with assistant ${assistantId}`);

    // Create a run to handle the message request
    let run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,

        // Append the following to the run's instructions: 
        // - The assistantId so we can use it within tool calls as arguments (probably not ideal way to do this)
        // - Additional context from the DB from the previous messages and tool executions
        additional_instructions: `
            Your assistantId is ${assistantId}.
            
            ---

            Use the following context from your memory to provide a more accurate response to the message.

            ${await getContextFromSimilaritySearch(supabase, userInput)}
            `,
    });

    console.log(`⏳ Run ${run.id} created, waiting for completion...`);

    // Wait for the run to complete and keep polling every second
    while (run.status === 'in_progress' || run.status === 'queued') {
        console.log(`🔄 Run status: ${run.status}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        run = await client.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Once the run is created, return it and begin the performRun function.
    console.log(`✅ Run ${run.id} completed with status: ${run.status}`);
    return run;
}