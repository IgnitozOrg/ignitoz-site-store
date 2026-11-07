# Design

## Context

The service uses NestJS, Tavily Search, in-memory state and local HTTP tests. See the proposal and spec for its scope and behavioral contract, and the project document `docs/specs/openspec-adoption-news.md` for the agreed requirements and exploratory evidence. Implementation progress is tracked in `tasks.md`.

Cloud Run is the deployment platform and the frontend calls the service directly. The current backend URL is `https://ignitoz-services-206126963043.us-central1.run.app`. Each process owns its cache and request counters.

## Goals / Non-Goals

**Goals:** Expose a stable public contract, bound each refresh to one search plus one retry, preserve useful stale data during outages, standardize public errors, and make access behavior explicit for Cloud Run.

**Non-Goals:** Verify adoption claims, guarantee relevant or bilingual results, add persistent/shared state, coordinate instances, impose a global spending cap, implement frontend cards, create or run Playwright tests against the deployed service, connect E2E execution to GCP deployment, or run deployment stress/multiple-IP tests.

## Decisions

### HTTP boundary and common errors

Keep `GET /news/openspec-adoption` with `{ "items": [{ "title", "url", "excerpt", "publishedAt", "thumbnailUrl" }], "fetchedAt", "stale" }`. Dates are ISO 8601 strings. Ignore client search and refresh controls. An empty successful selection is a valid response and is cached.

Use a common JSON error contract across the API containing `statusCode` and a public `message`. Preserve meaningful HTTP status codes, including 429 for the visitor limit. When news cannot be obtained and no previous successful result exists, return 503 with a generic service-unavailable message. The public response must not disclose whether the cause is provider downtime, exhausted quota or another internal failure. Unexpected errors must also be sanitized; credentials and internal details must not appear in responses. Document the common format alongside the endpoint contract.

### Single search and selection

Keep the injectable Tavily Search adapter and server-side `TAVILY_API_KEY`. Configure `OPENSPEC_NEWS_QUERY` as `Companies sharing their experience adopting OpenSpec in production`. Read the fixed query from that variable, using only the literal `"openspec"` when the variable is absent or empty (equivalent to `config.get<string>('OPENSPEC_NEWS_QUERY') || "openspec"`). Use a nonempty configured value unchanged; there is no other default phrase. Send `topic: "news"`, `search_depth: "advanced"`, numeric `max_results: 10`, `include_images: true` and `exclude_domains: ["reddit.com", "github.com", "instagram.com", "youtube.com", "facebook.com", "udemy.com", "coursera.org", "platzi.com", "edx.org", "codely.com", "tavily.com", "pi.dev", "signadot.com", "alagesanpalani.com", "github.io"]`. Use `time_range: "week"` and retain `include_published_date: true` and `filter_by_published_date: true`. The provider result limit is ten before local filtering, not a pool of twenty. Request dates and a recent period using the provider's controls, then enforce eligibility in the backend rather than trusting the provider filter alone. For each newly selected result, exclude unusable dates, dates older than the preceding seven days and future dates relative to the search time. Use a rolling interval of seven times 24 hours, inclusive at query time and query time minus seven days. This selection rule does not remove publications from an existing cache as they age; the 24-hour cache and stale wait are unchanged. Sort eligible publications newest first and take at most ten.

Only a usable in-period date is mandatory. Missing title, link, excerpt or thumbnail becomes an empty string instead of dropping the publication. Return supplied links literally, including invalid links; presentation and opening behavior belong to the future frontend. Deduplicate using available original links, while keeping publications without links distinct.

There is no complementary search, even when fewer than ten eligible results remain. On a failed provider request, retry that same fixed request once, with a bounded timeout per attempt. A successful empty result does not trigger a retry. The whole refresh, including its single retry, is shared across concurrent visitors.

The historical exploratory check made recent and unfiltered searches and returned HTTP 200. The recent result was a repository reference; the other response contained tutorials and unrelated adoption material, with no demonstrated Spanish coverage. This evidence is recorded in the project document and does not justify promising relevance, language coverage or independently verified publication dates. The unfiltered search is historical evidence and is no longer part of the requested runtime behavior.

### Per-publication thumbnails

Preserve each result's `images` metadata through the adapter. Populate `thumbnailUrl` from the first nonempty string URL in that result's image array, skipping entries without such a URL. Missing, empty or malformed image metadata yields an empty string without discarding the publication. Do not use the response's top-level query-related image list as an article thumbnail or take an image from a different result.

The [Tavily Search reference](https://docs.tavily.com/documentation/api-reference/endpoint/search) documents per-result images when `include_images` is enabled. Return the selected URL without downloading, resizing, storing or proxying the image; frontend rendering remains outside scope. Include thumbnails in cache replacement and preserve them unchanged during stale fallback.

The project document distinguishes two historical monthly explorations from the historical weekly exploration with the previous configured query and four excluded domains. The weekly sample returned seven dated results, six with source images, and English titles/excerpts; it included company articles, a reference, a course and job listings, rather than seven verified adoption case studies. The bounded exploration of the new query and 15-domain exclusion list returned four dated results in English; three had source images, and the observed titles and excerpts did not establish company adoption in production. The project document records its effective query and settings without credentials. Neither a configured query nor the broad `"openspec"` fallback guarantees organizational adoption evidence.

### Cache, stale fallback and concurrency

Keep one in-memory selection per process, its original successful `fetchedAt`, a `stale` state, a separate next-refresh deadline and one in-flight promise. The next-refresh deadline must be independent of `fetchedAt`: successful news is reused for 24 hours; a failed refresh may extend the wait without claiming that the news was fetched again.

On initial success or successful renewal, atomically replace the selection, record the successful retrieval time, set `stale: false` and schedule the next eligible refresh after 24 hours. This includes empty selections. Before that deadline, return the stored value without querying Tavily. At the deadline, the next request starts a shared refresh; there is no scheduled job.

If the request and its retry both fail and a prior result exists, preserve every news item and the original `fetchedAt`, set `stale: true`, and postpone the next provider query for another 24 hours from that failure. All visitors within that wait receive the stored stale result. Later failures can repeat this behavior without a maximum stale age. Do not re-filter the old selection by the current date during fallback; that would change the preserved data.

If no prior result exists, return the generic 503, do not cache the error and allow the next request to initiate another search with its one retry. Clear the in-flight promise on success or failure. Restarting the process loses all state. A new process therefore follows the no-cache path, even if another instance or a replaced process previously obtained news.

### Access and Cloud Run client IP

Allow CORS for `https://ignitoz.com` and `https://www.ignitoz.com`. These are frontend origins, not the backend URL. A disallowed origin does not receive CORS permission; CORS is not authentication and does not require rejecting direct HTTP calls.

Default the per-instance fixed-window limiter to `NEWS_RATE_LIMIT=30` and `NEWS_RATE_WINDOW_MS=60000`, retaining configuration overrides. Identify the visitor IP using the actual direct Cloud Run request path, with narrowly configured Express proxy trust or equivalent trusted-header processing. Check the documented platform header contract before selecting the trust configuration; do not blindly trust client-supplied forwarded headers or assume that the current `req.ip` is the original visitor.

When a reliable client IP cannot be established, serve the request without applying the IP limit. Do not group these visitors under an invented shared `unknown` IP. This exception does not bypass provider availability or other API behavior. Unit/local HTTP tests must cover trusted and untrusted header handling and the missing/unreliable-IP path. No Apigee or additional proxy is required. End-to-end verification of real IPs and rate limits in Cloud Run is separate follow-up work.

### Local verification

Use two complementary local suites: isolated unit tests run by `npm test`, and HTTP integration tests using Nest Testing and Supertest run by `npm run test:e2e`. Retain the existing HTTP tests for routing, module wiring, CORS and the complete endpoint workflow. Unit tests must not open HTTP servers or contact Tavily/production, and must test public operations without calling private methods or inspecting cache internals.

Require dedicated unit suites for:

- `NewsService`: use a fake provider and controlled clock to verify seven-day selection boundaries (both inclusive endpoints and just outside them), optional fields, literal links/deduplication, count/empty results, one retry, concurrent refresh sharing, fresh/stale cache deadlines, preserved data even when cached publications age beyond seven days, and recovery after no-cache errors. Include first source-image selection, absent/empty/malformed image arrays, no query-level fallback and thumbnail preservation in cached/stale responses.
- `TavilySearchService`: simulate fetch to verify configured queries and the exact `"openspec"` fallback for absent/empty configuration, exact news/advanced/ten-result/image/week/15-domain-exclusion parameters, preserved source-image metadata, missing credentials, non-success HTTP responses, invalid JSON, invalid response structure, network errors, deterministic timeout cancellation and sanitized failures. Merely asserting that an abort signal exists does not verify timeout behavior.
- `ClientIpService`: verify direct socket handling outside Cloud Run, the trusted final forwarded entry in Cloud Run, ignored untrusted prefixes, missing/invalid headers and canonical IPv4/IPv6 identities.
- `NewsRateLimitGuard`: verify defaults/overrides, independent allowances, exact window expiry, 429 behavior, unreliable-IP bypass and rejection of zero, negative, fractional and nonnumeric limit/window configuration.
- `ApiExceptionFilter`: verify the common response shape, preserved HTTP statuses, generic 503/500 messages and absence of internal details, credentials and stack traces.

Extend the HTTP suite to verify that `thumbnailUrl` is present on every item, belongs to its own source or is empty, and survives cache reuse and stale fallback.

These unit suites supplement the HTTP suite; they do not require one unit file for every delegating controller, declarative module or bootstrap entrypoint. Both suites must pass. Completion is based on the specified scenarios, not an arbitrary coverage percentage. Local proxy simulations do not establish the deployed network topology.

Playwright setup, deployed-service availability/CORS tests and their deployment integration are outside this change. They may be planned separately and are not required to complete or verify this implementation.

## Risks / Trade-offs

- Poor relevance and incomplete language/date coverage are accepted; invalid/out-of-period dates are excluded, not invented.
- A stale selection can become arbitrarily old during repeated failures. Preserve `fetchedAt` and `stale: true` so consumers can see its real age.
- Failed refreshes with an existing selection wait another 24 hours, which also delays recovery visibility. With no selection, later requests can repeatedly retry the provider.
- Per-instance counters and caches do not impose a global rate or spending limit. Restarting or scaling out can cause additional searches.
- Failing open when IP identification is unreliable favors news availability and leaves those requests without IP limiting.
- Provider links and images may be unavailable or unusable; rendering belongs to the future frontend. Missing thumbnails do not remove eligible news.
- With a provider maximum of ten, date filtering and deduplication can leave fewer items; no complementary search fills them.

## Migration Plan

Adapt the existing implementation and tests to these artifacts, document the agreed settings and common API errors, and run build, lint and automated suites. Configure the server credential and the client-IP handling for direct Cloud Run access. Include the active `OPENSPEC_NEWS_QUERY=Companies sharing their experience adopting OpenSpec in production` setting in `.env.example`, with no commented-out assignments or comments, use the weekly provider period and local seven-day selection, and configure all 15 excluded domains. Existing nonempty `OPENSPEC_NEWS_QUERY` values continue to determine the query; the environment owner may update them for relevance or remove them to use `"openspec"`. Clearing a variable is not required when its current query is desired. Process replacement clears cached items, so the added thumbnail field requires no persistent-state migration. Completion of this change does not require a deployed Playwright suite, a pre-release environment or deployment-trigger integration. Real IP/rate-limit deployment checks and stress tests remain separate follow-up work. This change has no data migration because all state is in memory.
