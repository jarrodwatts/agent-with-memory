import OpenAI from "openai";
import { Thread } from "openai/resources/beta/threads/threads";

export async function createThread(client: OpenAI): Promise<Thread> {
    return await client.beta.threads.create();
}
