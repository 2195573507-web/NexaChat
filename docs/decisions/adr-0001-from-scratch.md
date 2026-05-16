# ADR-0001: Build NexaChat From Scratch

## Status

Accepted

Current relevance note: the original navigation cap was written before the chat-first 7-module mainline. The active source facts are 7 first-level modules and `/ -> /chat/conversations`; the "from scratch" decision and local-first boundaries still apply.

## Context

NexaChat is a new product, not a continuation of an old app. The project needs clear module boundaries, local-first data ownership, and a UI that does not inherit previous clutter or styling experiments.

## Decision

Start from an empty repository and do not move old project code, old `src`, old UI, old runtime, or old folder structure into NexaChat. Old project experience is used only as requirement input.

## Why From Scratch

- Avoid inherited module confusion.
- Avoid old brand and UI residue.
- Avoid accidental reuse of diagnostic/mock Gateway code.
- Rebuild around local SQLite history from day one.
- Make Provider / Model / Router / Gateway separation foundational.

## Old Project Lessons

- Too many navigation entries reduce clarity.
- Feature shells create a false sense of progress.
- Provider, Model, Router, Gateway, and Chat must not be mixed.
- UI changes must be visible and useful, not just token changes.
- Docs and handoff surfaces are deliverables.

## How NexaChat Avoids Old Problems

- Navigation avoids excessive first-level entries; the current source fact is 7 first-level modules.
- Completion labels stay honest.
- Planned features are marked as reserved.
- Backend service boundaries are defined before code.
- UI direction rejects complex Liquid Glass and cluttered admin pages.

## Consequences

The first implementation round may be slower than copying code, but the project starts with cleaner ownership, clearer data model, and fewer hidden compatibility traps.
