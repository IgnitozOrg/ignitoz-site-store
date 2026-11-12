# Tasks

## 1. SerpApi provider

- [x] 1.1 Replace the Tavily adapter and module wiring with a SerpApi Google Search adapter; verify mocked requests use the configured or fallback query with `-site:github.com` appended, `tbs=qdr:m3`, `hl=en` and the server credential.
- [x] 1.2 Handle provider errors, malformed responses, timeouts and absent results; verify sanitized failures, timeout cancellation and empty-success behavior in isolated provider tests.
- [x] 1.3 Document deployment configuration for `SERPAPI_API_KEY` and the existing query; `.env.example` already lists both names used by the adapter.

## 2. Selection and contract

- [x] 2.1 Map organic results to publication fields, convert supported absolute and relative dates to ISO 8601, and omit results without usable dates.
- [x] 2.2 Preserve result order and duplicates from a single provider search without a complementary search.
- [x] 2.3 Return normalized publication results in `items`; verify the complete public response shape in unit and HTTP tests.

## 3. Availability and integration

- [x] 3.1 Verify cached empty and nonempty results, shared concurrent refresh, retry, stale fallback, renewal and no-cache 503 behavior using controlled time and mocked provider responses.
- [x] 3.2 Update HTTP integration tests for SerpApi and run the relevant unit and HTTP suites, including existing access, CORS, rate-limit and error-sanitization coverage.
- [ ] 3.3 Verify and record before deployment that identified consumers use `/news?topic=openspec` and support the retained publication fields and estimated relative publication dates, and document the new credential and rollback prerequisites; flag any external consumer needing a separate update.


## 4. Backend-enabled topic selection

- [x] 4.1 Expose `GET /news?topic=openspec`, remove the former route, and reject missing, empty, repeated, malformed or disabled topics with generic 400 responses without provider calls.
- [x] 4.2 Register enabled topic queries in the backend; only enable `openspec`, using `OPENSPEC_NEWS_QUERY` or the existing fallback. Keep client search controls ineffective.
- [x] 4.3 Isolate cached results, refresh deadlines, shared refreshes, retries and stale fallback per enabled topic; verify isolation with controlled dependencies and time.
- [x] 4.4 Update unit and HTTP coverage, deployment documentation and delta specs; run unit and HTTP suites, build, lint and OpenSpec validation.
