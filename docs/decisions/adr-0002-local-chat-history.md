# ADR-0002: Local Chat History In SQLite

## Status

Accepted

## Why Local History

NexaChat is local-first. Conversation history is user data and must remain available even when API keys, Providers, Models, Base URLs, or network state change.

## Why SQLite

SQLite provides transactions, indexes, FTS, portable backups, migration support, and a reliable local data model for desktop apps. It is stronger than localStorage or loose JSON files for long-term history.

## Message-Level Provider And Model Records

Each assistant message records actual `provider_id`, `model_id`, `model_name_snapshot`, `request_id`, tokens, latency, finish reason, and error details. This makes replies auditable after Provider/Model configuration changes.

## Conversation Is Not Bound To A Single API

A conversation can start with DeepSeek, continue with Claude, and continue with Ollama. The conversation owns local messages; APIs only generate replies.

## API Switch Continuation

When the user switches API/Provider/Model:

1. Existing conversation and messages remain unchanged.
2. New requests use the selected route.
3. New assistant messages record the new actual Provider/Model.
4. UI shows that local history remains in this conversation.

## Context Sending Strategy

The context builder supports:

- Recent N turns.
- Summary + recent N turns.
- Manual selected context.
- Token automatic trimming.

The chosen strategy is recorded in request logs so users can understand what context was sent.

## Consequences

The schema must be designed early and migrations must be treated seriously. The benefit is durable, searchable, exportable, Provider-neutral history.

