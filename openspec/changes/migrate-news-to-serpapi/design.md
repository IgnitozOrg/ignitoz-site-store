# Design

## Context

The current NestJS provider calls Tavily; `NewsService` owns normalization, a 24-hour instance-local cache, shared refreshes and one retry. The durable capability currently describes Tavily and must be updated by this change's delta. See the proposal and delta for scope and behavior.

## Goals / Non-Goals

**Goals:** Adapt the provider boundary and normalization without disturbing availability, access controls or error sanitization.

**Non-Goals:** Scraping articles, enriching descriptions, distributed caching, client search controls or modifying external consumers in another repository.

## Decisions

- Replace `TavilySearchService` in module wiring with a SerpApi adapter using the existing fetch and timeout approach. Send `engine=google_news`, `hl=en`, the fixed `q` and `SERPAPI_API_KEY`; encode query parameters and never log the credential-bearing URL. This avoids adding an SDK solely for one request. Keep the current cancellation and sanitized failure behavior.
- Validate the response as an object. Treat a provider error, HTTP failure, invalid JSON, or a present non-array `news_results` as failure; an absent `news_results` without error is an empty success. This preserves retry semantics while allowing valid empty results.
- For a result containing `stories`, use only the first entry as its candidate; do not use later entries if the first is ineligible. An empty `stories` array yields no candidate. For other results use the result itself. Map each candidate's `title`, `link`, `iso_date`, and `thumbnail` to the public fields. Filter invalid or out-of-window dates; choose the newest item per nonempty link before sorting and limiting. Avoid inheriting dates or thumbnails between grouped articles.
- Keep cache and retry ownership in `NewsService`; a successful empty array is cached. Avoid a new provider-specific cache that could undermine shared refresh and stale behavior.

## Risks / Trade-offs

- [Fewer than 20 eligible results, including zero] → Accept the single response and do not issue a fill search.
- [`excerpt` removal breaks consumers] → Verify and coordinate consumers before deployment; do not claim they were updated in this repository.
- [Credential in provider request parameters] → Avoid logging request URLs and sanitize errors and responses.
- [Provider shape or date availability changes] → Cover grouped, malformed and missing fields with mocked tests; missing dates are excluded.

## Migration Plan

1. Configure `SERPAPI_API_KEY` in the deployment environment and retain the existing `OPENSPEC_NEWS_QUERY` value.
2. Verify consumers no longer depend on `excerpt`; deploy after coordination.
3. If rollback is needed, restore the prior application version and its Tavily credential and account for the old response contract. Instance-local caches reset on restart.
