import OpenAI from "openai";
import { Assistant } from "openai/resources/beta/assistants";
import { tools } from '../tools/allTools.js';
import { assistantPrompt } from "../const/prompt.js";

export async function createAssistant(client: OpenAI): Promise<Assistant> {
    return await client.beta.assistants.create({
        model: "gpt-4o-mini",
        name: "Alt",
        instructions: assistantPrompt,
        tools: [
            ...Object.values(tools).map(tool => tool.definition),
        ]
    });
}
