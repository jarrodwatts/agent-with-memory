import { SupabaseClient } from "@supabase/supabase-js";
import { client } from "../index.js";

export interface ToolExecutionStore {
    thread_id: string;
    run_id: string;
    message_id?: string;
    tool_name: string;
    input_args: any;
    output: any;
    status: 'success' | 'error';
    error_message?: string;
}

export default async function storeToolExecution(supabase: SupabaseClient, execution: ToolExecutionStore) {
    console.log(`📝 Storing tool execution for ${execution.tool_name}`);

    // Generate embedding for the tool execution (useful for searching related executions)
    const content = JSON.stringify({
        tool: execution.tool_name,
        input: execution.input_args,
        output: execution.output
    });

    const embedding = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: content,
    });

    const { data, error } = await supabase
        .from('tool_executions')
        .insert([{
            ...execution,
            embedding: embedding.data[0].embedding
        }])
        .select();

    if (error) {
        console.error('❌ Tool execution storage failed:', {
            code: error.code,
            message: error.message,
            details: error.details
        });
        throw error;
    }

    console.log('✅ Tool execution stored successfully:', {
        tool: execution.tool_name,
        timestamp: new Date().toISOString()
    });

    return data;
} 