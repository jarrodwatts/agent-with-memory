import { Assistant } from "openai/resources/beta/assistants.mjs";
import { Thread } from "openai/resources/beta/index.mjs";

export interface Agent {
    assistant: Assistant;
    // Record of threads, keyed by assistantId -> Thread
    threads: Record<string, Thread>;
    metadata: AgentMetadata;
}

export interface AgentMetadata {
    managerAssistantId: string | null; // null for the CEO
    subordinateAssistantIds: string[]; // array of assistant ids that this agent created
} 