# Design

## Context

Before this migration the NestJS provider called Tavily; `NewsService` owned normalization, a 24-hour instance-local cache, shared refreshes and one retry. The durable capability currently describes Tavily and must be updated by this change's delta. See the proposal and delta for scope and behavior.

## Goals / Non-Goals

**Goals:** Adapt the provider boundary and return normalized publication results without disturbing availability, access controls or error sanitization.

**Non-Goals:** Scraping articles, enriching descriptions, distributed caching, arbitrary client search controls or modifying external consumers in another repository.

## Decisions

- Expose `GET /news` with one required `topic` query value. `NewsTopicsService` owns the backend registry; initially only `openspec` is enabled and resolves to `OPENSPEC_NEWS_QUERY` or `openspec`. Reject missing, empty, repeated, non-string or disabled identifiers with a generic 400 before accessing cache or provider. Other client controls remain ignored. Remove the former `/news/openspec-adoption` route (404) and coordinate the consumer URL update before deployment.
- Pass the resolved server-owned query to the SerpApi adapter. Store cached response, refresh deadline and pending refresh per topic in `NewsService`. Share refreshes only within the same topic and never use another topic's results as stale fallback.

- Use a SerpApi adapter with `engine=google`, `hl=en`, the configured or fallback query with `-site:github.com` appended, `tbs=qdr:m3` and the server-side credential. Encode query parameters and never log credential-bearing request URLs or request metadata. Provider organic results may be logged as a structured debug object for diagnostics; disable debug in production. Preserve the existing timeout and sanitized failure behavior.
- Validate the response as an object. Treat HTTP failures, invalid JSON, provider errors, or a present non-array `organic_results` as failure. A response without `organic_results` and without an error, or the documented Google Search no-results error without `organic_results`, is an empty success.
- Map each organic result to `title`, `url`, `excerpt`, `publishedAt`, and `thumbnailUrl`, preserving order and duplicates. Use empty strings for missing text fields. Convert supported absolute dates to ISO 8601 and relative minutes, hours, days, weeks, and months to an estimated ISO timestamp relative to retrieval time. Interpret date-only values in UTC and clamp month subtraction to the last valid day. Omit results with missing or unparseable dates; never substitute the retrieval timestamp. Google Search applies the three-month query filter without local date-window filtering.
- Keep cache and retry ownership in `NewsService`; a successful empty array is cached. Avoid a new provider-specific cache that could undermine shared refresh and stale behavior.

## Risks / Trade-offs

- [Fewer results than desired, including zero] → Accept the single response and do not issue a fill search.
- [Provider dates can be relative and imprecise] → Convert relative values to estimates based on retrieval time; do not claim exact publication times.
- [Credential in provider request parameters] → Avoid logging request URLs and sanitize errors and responses.
- [Provider shape or date availability changes] → Verify field mapping and date parsing; omit results without a usable date.

## Migration Plan

1. Configure `SERPAPI_API_KEY` in the deployment environment and retain the existing `OPENSPEC_NEWS_QUERY` value.
2. Update consumers to `/news?topic=openspec` and verify the retained publication fields; deploy after coordination.
3. If rollback is needed, restore the prior application version and its Tavily credential and account for the old response contract. Instance-local caches reset on restart.

Consumer check (2026-11-07): the local `ignitozorg.github.io` checkout at `31622f8` had no references to the news endpoint or `excerpt`. The deployed site and unidentified external consumers remain unverified; confirm their compatibility with the response before deployment and coordinate any separate updates.
