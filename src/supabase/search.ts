import { SupabaseClient } from "@supabase/supabase-js";
import { client } from "../index.js";

export default async function searchSimilarMessages(supabase: SupabaseClient, query: string) {
    console.log('🔍 Starting similarity search...');
    console.log(`🔍 Query length: ${query.length} characters`);

    console.log('🔄 Generating embedding for search query...');
    const embedding = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
    });
    console.log('✅ Search query embedding generated');

    console.log('🔍 Executing similarity search in database...');
    const result = await supabase.rpc('match_messages', {
        query_embedding: embedding.data[0].embedding,
        match_threshold: 0.7,
        match_count: 5
    });

    if (result.error) {
        console.error('❌ Similarity search failed:', {
            code: result.error.code,
            message: result.error.message,
            details: result.error.details
        });
        throw result.error;
    }

    console.log(`✅ Search complete. Found ${result.data?.length || 0} matches`);
    
    return result;
}