# Proposal

## Why

Replace Tavily with SerpApi for OpenSpec-related news while preserving the endpoint's existing availability and cache behavior. Search results are related publications, not evidence of organizational adoption.

## What Changes

- Search Google through SerpApi in English, using the configured query with `-site:github.com` appended, a three-month provider date filter and server-side credential.
- Map the provider’s `organic_results` to the existing publication fields in provider order as `items`. Exclude GitHub through the query and do not perform a complementary search.
- Treat a provider response without organic results or with Google’s explicit no-results message as an empty success.
- Preserve the existing publication response fields and convert supported provider dates to ISO 8601.
- Preserve per-instance caching, concurrent refresh sharing, one retry, stale fallback and generic errors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `openspec-adoption-news`: Provider retrieval, publication fields and empty-result behavior change; existing access and availability requirements remain.

## Impact

The NestJS news provider, normalization, configuration, unit and HTTP tests change. Deployment requires `SERPAPI_API_KEY`; the publication response fields remain unchanged. No article scraping or client-controlled searches are in scope.
