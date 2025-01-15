# Agent with Memory

An AI Agent built with [OpenAI Assistants](https://platform.openai.com/docs/assistants/overview)
that has a memory system built with [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
stored inside a [Supabase](https://supabase.com/) Postgres database.
It stores all messages sent by the user and all agents in the database, along with a vector embedding of the message content.

The repo also includes the logic for agents to create and communicate with other agents.

Before an agent responds, it will search the database for the most relevant messages to the user's input and use them to generate a more tailored response. Interestingly, communication
that occurs between agents is also stored in the database, and all agents can access each other's message history and access the vector embeddings to generate more tailored responses.

## Setup

```bash
git clone https://github.com/jarrodwatts/agent-with-memory.git
cd agent-with-memory
```

```bash
npm install
```

### Setup Environment Variables

- Create a new Supabase project and get the URL and API key.
- Create a new OpenAI project and get the API key.
- Optionally, create a new wallet private key to submit transactions on the Abstract testnet

Environment variables:

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-

# Supabase
SUPABASE_URL=https://
SUPABASE_API_KEY=

# Private Key
PRIVATE_KEY=0x
```

### Setup Supabase Databases

1. Enable Vector Support:

```sql
-- Enable the pgvector extension to work with embeddings
create extension vector;
```

2. Create the Messages Table:

```sql
create table messages (
  id int4 primary key generated always as identity,
  thread_id text not null,
  run_id text,
  message_id text not null,
  content text not null,
  role text not null,
  created_at timestamptz default now(),
  tool_calls jsonb,
  annotations jsonb,
  file_references jsonb,
  embedding vector(1536),
  receiver_id text,
  sender_id text
);
```

3. Create the Tool Executions Table:

```sql
create table tool_executions (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  run_id text not null,
  message_id text,
  tool_name text not null,
  input_args jsonb,
  output jsonb,
  status text not null,
  error_message text,
  created_at timestamptz default now(),
  embedding vector(1536)
);
```

4. Create a Function to Search Messages:

```sql
create or replace function match_messages (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id int4,
  content text,
  role text,
  thread_id text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    messages.id,
    messages.content,
    messages.role,
    messages.thread_id,
    1 - (messages.embedding <=> query_embedding) as similarity
  from messages
  where 1 - (messages.embedding <=> query_embedding) > match_threshold
  order by messages.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

5. Create a Function to Search Tool Executions:

```sql
create or replace function match_tool_executions (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  tool_name text,
  input_args jsonb,
  output jsonb,
  status text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    tool_executions.id,
    tool_executions.tool_name,
    tool_executions.input_args,
    tool_executions.output,
    tool_executions.status,
    1 - (tool_executions.embedding <=> query_embedding) as similarity
  from tool_executions
  where 1 - (tool_executions.embedding <=> query_embedding) > match_threshold
  order by tool_executions.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

## Run

```bash
npm run start
```
