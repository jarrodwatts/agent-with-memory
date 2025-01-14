# Agent with Memory

An AI Agent built with [OpenAI Assistants](https://platform.openai.com/docs/assistants/overview)
that has a memory system built with [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
stored inside a [Supabase](https://supabase.com/) Postgres database.

It stores all messages sent by the user and all agents in the database, along with a vector embedding of the message content.

Before each agent 

## Setup

```bash
npm install
```

Environment variables:

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-

# Private Key
PRIVATE_KEY=0x

# Supabase
SUPABASE_URL=https://
SUPABASE_API_KEY=
```

## Run

```bash
npm run start
```

