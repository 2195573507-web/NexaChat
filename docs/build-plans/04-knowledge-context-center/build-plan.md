# Knowledge And Context Center Build Plan

## Final Goal

Design a knowledge and context module that can manage files, knowledge bases, RAG, embeddings, rerank, citations, project context, temporary context, memory, summaries, and context compression without blocking the v1 chat core.

## Scope

Includes PDF, Word, Excel, PPT, Markdown, TXT, CSV, JSON, code files, knowledge bases, RAG, embeddings, rerank, source citations, parse status, project context, temporary context, memory system, conversation summary memory, context compression, and chat integration.

Does not include full enterprise document management, remote collaboration, or automatic cloud sync in v1.

## Submodules

- File manager.
- Knowledge bases.
- Parser status.
- Embedding and rerank configuration.
- Retrieval settings.
- Project context.
- Temporary context.
- Memories.
- Conversation summary memory.
- Context compression.

## Key Features

- Files are stored locally with metadata and parse state.
- Knowledge base groups files and chunks.
- RAG retrieves chunks and returns citations to Chat.
- Embedding and rerank are provider interfaces, not hardcoded to one vendor.
- Temporary context can be attached to a single conversation without becoming global memory.
- Memory system distinguishes explicit memories, conversation summaries, and compressed context.

## Relationship With Other Modules

- Chat uses retrieved context and citations.
- Provider/Model center supplies embedding and rerank models.
- Data configuration imports/exports files and knowledge metadata.
- Logs records parse, embedding, and retrieval errors.
- Security controls sensitive file paths and diagnostic exports.

## Data Requirements

Main tables: `knowledge_bases`, `files`, `knowledge_chunks`, `memories`, `conversations`, `messages`, `request_logs`, `usage_records`.

Inputs: uploaded files, parse outputs, embedding model selection, rerank settings, user context toggles.  
Outputs: chunks, citations, retrieval traces, memory records, summary records.

## UI Requirements

- Knowledge page tabs: 文件, 知识库, 检索设置, 上下文, 记忆.
- File table shows type, size, parse status, chunk count, associated knowledge bases, errors.
- Knowledge base detail shows documents, index status, retrieval settings, test query panel.
- Chat right panel shows selected knowledge bases, retrieved chunks, citations, and failures.
- File parsing states include queued, parsing, indexed, failed, stale.

## Security Requirements

- Exports can redact local file paths.
- Sensitive files require explicit attachment to Chat.
- Retrieval traces should not leak API keys or hidden prompts.
- Memory deletion must be explicit and auditable.

## Extension Interfaces

- File parser interface.
- Chunking strategy interface.
- Embedding provider interface.
- Rerank provider interface.
- Retriever interface.
- Memory store interface.
- Context compressor interface.

## Testing Requirements

- Upload supported file type and track parse status.
- Create knowledge base and run retrieval test.
- Attach knowledge to chat and verify citations.
- Simulate parse failure with repair actions.
- Verify memory and summary deletion.

## Acceptance Criteria

- Supported file categories are listed.
- RAG, embedding, rerank, citations, parsing status, project context, temporary context, memory, summaries, and compression are defined.
- Relationship with Chat is explicit.
- UI page structure and state behavior are clear.

## Risks

- Document parsing and embeddings can dominate v1 complexity.
- Bad citations reduce user trust.
- Memory may feel intrusive without clear controls.

## Future Enhancements

- OCR.
- Incremental re-indexing.
- Cross-workspace knowledge templates.
- Local vector DB comparison.
- Knowledge evaluation benchmarks.

