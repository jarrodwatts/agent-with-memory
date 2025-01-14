import OpenAI from "openai";
import { Thread } from "openai/resources/beta/threads/threads";
import { Run } from "openai/resources/beta/threads/runs/runs";
import { handleRunToolCalls } from "./handleRunToolCalls.js";
import storeMessage from "../supabase/storeMessage.js";
import supabase from "../supabase/initSupabaseClient.js";

export async function performRun(run: Run, client: OpenAI, thread: Thread, receiverId?: string) {
    console.log(`🚀 Starting run ${run.id} with status: ${run.status}`);

    // While there are tool calls to be made, call handleRunToolCalls
    while (run.status === "requires_action") {
        console.log(`⚙️ Run ${run.id} requires action - handling tool calls`);
        run = await handleRunToolCalls(run, client, thread);
    }

    console.log(`🚀 Run ${run.id} completed with status: ${run.status}`);

    if (run.status === 'failed') {
        const errorMessage = `I encountered an error: ${run.last_error?.message || 'Unknown error'}`;
        console.error('❌ Run failed:', run.last_error);
        console.log('📝 Creating error message in thread');
        await client.beta.threads.messages.create(thread.id, {
            role: 'assistant',
            content: errorMessage
        });
        return {
            type: 'text',
            text: {
                value: errorMessage,
                annotations: []
            }
        };
    }

    console.log(`📥 Fetching messages from thread ${thread.id}`);
    const assistantMessage = (await client.beta.threads.messages.list(thread.id, {
        order: 'desc',
        limit: 1
    })).data[0];
    
    if (!assistantMessage) {
        console.log('⚠️ No assistant message found');
        return { type: 'text', text: { value: 'No response from assistant', annotations: [] } };
    }

    if (assistantMessage.content[0].type === 'text') {
        console.log('🤖 Assistant response:', assistantMessage.content[0].text.value);

        // TODO: Plugin some discord or smthn here.
        console.log("DISCORD RESPONSE GOES HERE!")

        // Store message in the DB
        await storeMessage(supabase, {
            sender_id: run.assistant_id,
            receiver_id: receiverId || "USER",
            content: assistantMessage.content[0].text.value,
            message_id: assistantMessage.id,
            thread_id: thread.id,
            role: 'assistant'
        });

    } else {
        console.log('📎 Assisstant response type:', assistantMessage.content[0].type);
    }


    return assistantMessage.content[0] ||
        { type: 'text', text: { value: 'No response from assistant', annotations: [] } };
}