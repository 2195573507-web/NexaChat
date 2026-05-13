# Empty, Loading And Error States

## Empty States

### No Provider

- Reason: no generation channel has been configured.
- Action: add Provider.
- Secondary: import CCS/sub2api/OpenAI-compatible config or scan local providers.

### No Model

- Reason: Provider has no available model or model list was not fetched.
- Action: fetch model list or manually add model.
- Secondary: open provider connection test.

### No Conversation

- Reason: local history is empty.
- Action: start new conversation.
- Secondary: import chat history or choose assistant.

### No Knowledge Base

- Reason: no document collection exists.
- Action: create knowledge base.
- Secondary: upload supported file.

### No Logs

- Reason: no request has run yet.
- Action: run connection test or send a message.
- Secondary: open diagnostics guide.

### No API Key

- Reason: local gateway has no active key.
- Action: generate local API Key.
- Secondary: read external integration guide.

## Loading States

### Model Connection Testing

- Show inline spinner, endpoint, model, elapsed time.
- Disable repeated test on same row.
- Allow cancel after timeout threshold.

### Streaming Output

- Assistant message status is streaming.
- Stop button replaces send button.
- Partial content is persisted safely.

### File Parsing

- Show file chip with parsing state and progress.
- Right rail shows parse steps.
- Failure has retry.

### Knowledge Indexing

- Show chunk count, embedding progress, current model.
- Indexing does not block normal chat unless user selected that knowledge base.

### Gateway Starting

- Show port, bind mode, endpoint list.
- If port conflict occurs, provide choose another port action.

## Error States

Each error includes user-readable reason, technical details collapsed, fix suggestion, copy error button, and open logs button.

### 401 API Key Error

- Reason: API Key is missing, invalid, expired, or not accepted by Provider.
- Technical details: provider, endpoint, request id, redacted auth state.
- Fix: update API Key, check account, test Provider.

### 404 Endpoint Error

- Reason: Base URL or endpoint path is wrong, or Provider does not support the selected API.
- Technical details: URL path, method, provider type.
- Fix: verify Base URL, remove duplicate `/v1`, choose correct compatibility mode.

### 429 Rate Limit

- Reason: Provider quota/rate limit reached.
- Technical details: retry-after, provider, model if available.
- Fix: wait, switch model/provider, lower concurrency, check quota.

### Timeout Proxy Error

- Reason: network, proxy, DNS, firewall, or Provider latency problem.
- Technical details: proxy mode, timeout ms, endpoint.
- Fix: test proxy, disable proxy, change timeout, retry.

### model_not_found

- Reason: selected model name is not available for this Provider.
- Technical details: model id, provider id, fetched model list status.
- Fix: fetch model list, choose another model, check alias mapping.

### stream interrupted

- Reason: streaming connection ended before final response.
- Technical details: partial tokens, request id, provider error if available.
- Fix: retry, continue from partial output, switch non-stream mode.

### SQLite Read Failure

- Reason: database locked, missing, corrupted, or permission denied.
- Technical details: database path, sqlite error code.
- Fix: retry, close duplicate process, restore backup, export diagnostics.

### Config Import Failed

- Reason: unsupported format, invalid schema, conflict, or unsafe secret field.
- Technical details: file type, parser error, field path.
- Fix: review mapping, use redacted template, skip invalid fields.

## State Placement Rules

- Chat errors appear near the message/input.
- Provider errors appear inside Provider detail.
- Gateway errors appear in gateway status/logs.
- Import errors appear inside wizard step.
- Global toast is secondary feedback only, not the only explanation.

