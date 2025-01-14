import OpenAI from "openai";
import { Run } from "openai/resources/beta/threads/runs/runs";
import { Thread } from "openai/resources/beta/threads/threads";
import { tools } from '../tools/allTools.js';
import storeToolExecution from "../supabase/storeToolExecution.js";
import supabase from "../supabase/initSupabaseClient.js";

export async function handleRunToolCalls(run: Run, client: OpenAI, thread: Thread): Promise<Run> {

    // Get what tool calls the agent decided that it wants to make for this run
    const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls;

    // If there are no tool calls, just exit here and return the run
    if (!toolCalls) {
        console.log(`📭 No tool calls required for run ${run.id}`);
        return run;
    }

    // For each tool call, execute the tool (based on tool.handler function).
    // For each tool, store the tool execution in the database for later recall.
    const toolOutputs = await Promise.all(
        toolCalls.map(async (tool) => {

            // Only should hit here if your agent is misconfigured.
            // Ensure each tool has the correct name inside allTools!
            const toolConfig = tools[tool.function.name];
            if (!toolConfig) {
                throw new Error(`❌ Tool not found: ${tool.function.name}`);
            }

            console.log(`💾 Executing tool: ${tool.function.name}`);
            console.log(`📝 Tool arguments:`, tool.function.arguments);

            try {
                const args = JSON.parse(tool.function.arguments);
                console.log(`🎯 Parsed arguments:`, args);

                // Each tool has a handler function that defines what logic to execute.
                // Here we are just executing the handler function of the current tool in the loop.
                const output = await toolConfig.handler(args);

                console.log(`✅ Tool execution successful:`, output);

                // Store the successful tool execution in the database
                await storeToolExecution(supabase, {
                    thread_id: thread.id,
                    run_id: run.id,
                    message_id: undefined, // Will be linked when message is created
                    tool_name: tool.function.name,
                    input_args: args,
                    output: output,
                    status: 'success'
                });
                
                return {
                    tool_call_id: tool.id,
                    output: String(output)
                };
            }
            
            // If tool execution fails, just return the error message (probably can add more here later)
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`❌ Tool execution failed:`, errorMessage);

                return {
                    tool_call_id: tool.id,
                    output: `Error: ${errorMessage}`
                };
            }
        })
    );

    // Finally, submit the outputs from each tool to OpenAI and poll until the run is complete.
    console.log(`📤 Submitting tool outputs to OpenAI`);
    return client.beta.threads.runs.submitToolOutputsAndPoll(
        thread.id,
        run.id,
        { tool_outputs: toolOutputs } // Submit the outputs from each tool that was executed
    );
}