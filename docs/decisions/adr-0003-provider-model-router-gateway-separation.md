# ADR-0003: Separate Provider, Model, Router And Gateway

## Status

Accepted

## Responsibilities

- Provider: connection configuration, Base URL, auth mode, proxy, headers, health.
- Model: callable model metadata, capabilities, context length, pricing estimate, health.
- Router: strategy that chooses Provider + Model by user selection, task, price, speed, context, health, or fallback.
- Gateway: request execution, streaming, cancellation, retry, timeout, local API, logs, and usage.

## Why They Must Not Mix

Mixing these concepts makes model switching fragile, error handling duplicated, request logs ambiguous, and local gateway routing inconsistent.

## Chat Calls Router

Chat builds a generation request with conversation, context, assistant, and selected route hints. Router returns the actual Provider/Model decision.

## Gateway Reuses Router

The local gateway maps incoming model names to virtual or real route rules and calls Router. It does not duplicate route logic.

## Future API Support

New APIs enter through Provider adapters. The Chat UI and local history model should not change for every new vendor.

## Consequences

The architecture has more initial interfaces, but it prevents early coupling and enables local gateway, external app integration, and model fallback later.

