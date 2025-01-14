import { SupabaseClient } from "@supabase/supabase-js";
import searchSimilarMessages from "../supabase/search.js";
import searchSimilarToolExecutions from "../supabase/searchToolExecutions.js";
import { MessageStore } from "../supabase/storeMessage.js";
import { ToolExecutionStore } from "../supabase/storeToolExecution.js";

export async function getContextFromSimilaritySearch(
    supabase: SupabaseClient,
    query: string
): Promise<string> {
    // Search for similar messages and similar previous tool executions
    const [similarMessages, similarToolExecutions] = await Promise.all([
        searchSimilarMessages(supabase, query),
        searchSimilarToolExecutions(supabase, query)
    ]);

    let contextPrompt = '';

    // Add previous messages to the context prompt
    if (similarMessages.data && similarMessages.data.length > 0) {
        contextPrompt += `Previous relevant conversations:\n${similarMessages.data
            .map((msg: MessageStore) => `${msg.role}: ${msg.content}`)
            .join('\n')}\n\n`;
    }

    // Add tool execution context
    if (similarToolExecutions.data && similarToolExecutions.data.length > 0) {
        contextPrompt += `Previous relevant actions:\n${similarToolExecutions.data
            .map((exec: ToolExecutionStore) =>
                `Tool: ${exec.tool_name}\n` +
                `Input: ${JSON.stringify(exec.input_args)}\n` +
                `Output: ${JSON.stringify(exec.output)}\n` +
                `Status: ${exec.status}`
            )
            .join('\n\n')}\n\n`;
    }

    // Return the enhanced user message with context
    return contextPrompt;
}