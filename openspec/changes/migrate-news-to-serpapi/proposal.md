# Proposal

## Why

Replace Tavily with SerpApi for OpenSpec-related news while preserving availability behavior and isolating caches by backend-enabled topic. Search results are related publications, not evidence of organizational adoption.

## What Changes

- **BREAKING**: Replace `GET /news/openspec-adoption` with `GET /news?topic=openspec`; require one backend-enabled topic identifier and reject invalid or disabled values with a generic 400. Initially only `openspec` is enabled.

- Search Google through SerpApi in English, using the configured query with `-site:github.com` appended, a three-month provider date filter and server-side credential.
- Map the provider’s `organic_results` to the existing publication fields in provider order as `items`. Exclude GitHub through the query and do not perform a complementary search.
- Treat a provider response without organic results or with Google’s explicit no-results message as an empty success.
- Preserve the existing publication response fields and convert supported provider dates to ISO 8601.
- Preserve per-topic, per-instance caching, concurrent refresh sharing, one retry, stale fallback and generic errors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `openspec-adoption-news`: Provider retrieval, publication fields and empty-result behavior change; topic selection and route change; existing access and availability behavior remains for each topic.

## Impact

The NestJS news provider, normalization, configuration, unit and HTTP tests change. Deployment requires `SERPAPI_API_KEY`. The public endpoint is `/news?topic=openspec` and publication response fields remain unchanged. External consumer discovery and validation are outside this change's scope. No article scraping or arbitrary client-controlled searches are in scope.
