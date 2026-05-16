# ADR-0004: Simple Clear Desktop UI Direction

## Status

Accepted

Current relevance note: the UI direction still applies, but the active navigation fact is now 7 first-level modules with `/ -> /chat/conversations`. The older "8 modules" wording below is historical guidance about avoiding sidebar sprawl, not a current module count.

## Why Simple Clear UI

NexaChat is a high-frequency desktop tool. Users need to read, compare, configure, diagnose, and continue conversations for long sessions. Clarity matters more than visual novelty.

## Why Not Complex Liquid Glass

Heavy blur, large transparency, and decorative motion reduce readability, complicate accessibility, and age poorly in dense desktop tools.

## Why Limit Navigation Entries

The current 7-module navigation keeps mental load manageable and prevents sidebar sprawl. Deeper functions use second-level tabs and right rails.

## Why Modular Page Structure

Modular pages let Chat, Model, Knowledge, Gateway, Data Config, and Settings evolve without mixing state and controls.

## Why Three-Column Chat Layout

Chat needs conversation navigation, message focus, and context/model detail at once. A three-column or collapsible side-rail layout supports this without popups.

## Why Font Settings And KaiTi

Users may read or write long Chinese content. Default UI should use system fonts, while KaiTi / 楷体 is reserved as an optional creative reading/writing font for message body only.

## Avoiding Old UI Confusion

- No old project names.
- No fake completed modules.
- No cluttered admin tables as default.
- No large marketing hero inside the app.
- No multi-popup configuration flows.
