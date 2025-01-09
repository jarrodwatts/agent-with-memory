import { SupabaseClient } from "@supabase/supabase-js";
import { client } from "../index.js";

export interface MessageStore {
    assistant_id: string;
    thread_id: string;
    run_id?: string;
    message_id: string;
    content: string;
    role: 'user' | 'assistant';
    tool_calls?: any;
    annotations?: any;
    file_references?: any;
}

export default async function storeMessage(supabase: SupabaseClient, message: MessageStore) {
    console.log('📝 Starting message storage process...');
    console.log(`📝 Message details:
    - Role: ${message.role}
    - Thread ID: ${message.thread_id}
    - Message ID: ${message.message_id}
    - Content length: ${message.content.length} characters`);

    // Generate embedding for the content
    console.log('🔄 Generating embedding...');
    const embedding = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: message.content,
    });
    console.log('✅ Embedding generated successfully');

    // Insert into database
    console.log('💾 Inserting message into database...');
    const { data, error } = await supabase
        .from('messages')
        .insert([{
            ...message,
            embedding: embedding.data[0].embedding
        }])
        .select();

    if (error) {
        console.error('❌ Database insertion failed:', {
            code: error.code,
            message: error.message,
            details: error.details
        });
        throw error;
    }

    console.log('✅ Message stored successfully:', {
        messageId: data?.[0]?.message_id,
        timestamp: new Date().toISOString()
    });

    return data;
}