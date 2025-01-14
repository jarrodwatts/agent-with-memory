import { SupabaseClient } from "@supabase/supabase-js";
import { client } from "../index.js";

export default async function searchSimilarToolExecutions(supabase: SupabaseClient, query: string) {
    console.log('🔍 Starting tool execution similarity search...');

    const embedding = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
    });

    const result = await supabase.rpc('match_tool_executions', {
        query_embedding: embedding.data[0].embedding,
        match_threshold: 0.9,
        match_count: 5
    });

    if (result.error) {
        console.error('❌ Tool execution similarity search failed:', result.error);
        throw result.error;
    }

    return result;
} 