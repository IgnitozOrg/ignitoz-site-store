# Design

## Context

Before this migration the NestJS provider called Tavily; `NewsService` owned normalization, a 24-hour instance-local cache, shared refreshes and one retry. The durable capability currently describes Tavily and must be updated by this change's delta. See the proposal and delta for scope and behavior.

## Goals / Non-Goals

**Goals:** Adapt the provider boundary and return provider-native results without disturbing availability, access controls or error sanitization.

**Non-Goals:** Scraping articles, enriching descriptions, distributed caching, client search controls or modifying external consumers in another repository.

## Decisions

- Use a SerpApi adapter with `engine=google`, `hl=en`, the configured or fallback query with `-site:github.com` appended, `tbs=qdr:m3` and the server-side credential. Encode query parameters and never log the credential-bearing URL or provider response. Preserve the existing timeout and sanitized failure behavior.
- Validate the response as an object. Treat HTTP failures, invalid JSON, provider errors, or a present non-array `organic_results` as failure. A response without `organic_results` and without an error, or the documented Google Search no-results error without `organic_results`, is an empty success.
- Return `organic_results` directly as `items`, preserving provider fields, order and duplicates. Do not require publication dates or locally transform or filter results. Google Search applies the three-month query filter; do not substitute retrieval timestamps for missing result dates.
- Keep cache and retry ownership in `NewsService`; a successful empty array is cached. Avoid a new provider-specific cache that could undermine shared refresh and stale behavior.

## Risks / Trade-offs

- [Fewer results than desired, including zero] → Accept the single response and do not issue a fill search.
- [Provider-native items break consumers of normalized fields] → Verify and coordinate consumers before deployment; do not claim they were updated in this repository.
- [Credential in provider request parameters] → Avoid logging request URLs and sanitize errors and responses.
- [Provider shape or date availability changes] → Preserve provider fields and verify results with and without dates; the provider may not expose publication dates.

## Migration Plan

1. Configure `SERPAPI_API_KEY` in the deployment environment and retain the existing `OPENSPEC_NEWS_QUERY` value.
2. Verify consumers support provider-native organic results; deploy after coordination.
3. If rollback is needed, restore the prior application version and its Tavily credential and account for the old response contract. Instance-local caches reset on restart.

Consumer check (2026-11-07): the local `ignitozorg.github.io` checkout at `31622f8` had no references to the news endpoint or `excerpt`. The deployed site and unidentified external consumers remain unverified; confirm their compatibility with the provider-native contract before deployment and coordinate any separate updates.
