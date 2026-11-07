# Proposal

## Why

Replace Tavily with SerpApi for OpenSpec-related news while preserving the endpoint's existing availability and cache behavior. Search results are related publications, not evidence of organizational adoption.

## What Changes

- Search Google News through SerpApi in English, using the configured fixed query and server-side credential.
- Select up to 20 recent publications, taking only the first story from each grouped result, and retain the newest result for duplicate links. Do not exclude domains or perform a complementary search.
- Treat a provider response without news results and without an explicit error as an empty success.
- **BREAKING**: Remove `excerpt` from each publication in `GET /news/openspec-adoption`; consumers must no longer rely on it.
- Preserve per-instance caching, concurrent refresh sharing, one retry, stale fallback and generic errors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `openspec-adoption-news`: Provider retrieval, publication fields, selection, deduplication and empty-result behavior change; existing access and availability requirements remain.

## Impact

The NestJS news provider, normalization, configuration, unit and HTTP tests change. Deployment requires `SERPAPI_API_KEY` and coordination with consumers of `excerpt`. No article scraping or client-controlled searches are in scope.
