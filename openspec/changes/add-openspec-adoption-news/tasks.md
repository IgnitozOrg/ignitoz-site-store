# Tasks

Completed items below retain work already delivered and still valid. Changed behavior and verification against the revised contract remain open; earlier completion of the previous contract does not prove these new requirements.

## 1. Provider integration and selection

- [x] 1.1 Add server-side Tavily credential and fixed-query configuration, with an injectable Search adapter and bounded timeout; verify provider requests and failures using deterministic mocks without exposing the key.
- [x] 1.2 Replace the complementary-search flow with one recent search and enforce the preceding 30-day range locally, excluding missing, invalid and future dates; verify ordering, the ten-item cap, fewer results, empty results and absence of complementary calls through controlled-time HTTP tests.
- [x] 1.3 Perform and document an exploratory Tavily search using a configured credential; record actual relevance, publication dates, Spanish/English coverage and period-filter behavior without recording the credential.
- [x] 1.4 Preserve eligible publications with missing non-date fields, return missing fields empty, preserve supplied links and keep linkless items distinct; verify all optional-field and deduplication cases through HTTP tests and document the selection contract.

- [ ] 1.5 Update the provider payload to news/advanced/numeric ten results/images enabled/Reddit excluded and replace the default query with the agreed English phrase; extend adapter unit tests for the exact parameters, default/override behavior and preserved source-image metadata.
- [ ] 1.6 Add `thumbnailUrl` to news items using the first nonempty URL from their own image list, or empty when unavailable; add NewsService unit and HTTP tests for multiple/missing/empty/malformed image entries, no query-level or cross-publication fallback, and cached/stale thumbnail preservation.
- [ ] 1.7 Run and document a bounded exploratory Tavily search with the revised query and parameters; record relevance, publication dates, language coverage and source-image availability without credentials, distinguishing it from the historical experiment.

## 2. News endpoint and availability

- [x] 2.1 Expose public `GET /news/openspec-adoption` with the base `items`, ISO dates, `fetchedAt` and `stale` contract; verify successful fields, ignored client controls and credential redaction through HTTP tests.
- [x] 2.2 Implement the per-instance 24-hour successful-result cache and atomic refresh; verify normal reuse, expiry, successful renewal and caching of empty results through HTTP tests.
- [x] 2.3 Share the in-flight refresh across concurrent requests; verify initial and expired-cache requests reuse the same pending operation.
- [x] 2.4 Retry a failed Tavily request exactly once within the shared refresh; verify first-attempt success, retry success, both-attempt failure, no retry for empty success and concurrent requests sharing both attempts.
- [x] 2.5 Separate the next-refresh deadline from the successful retrieval timestamp and wait another 24 hours after both attempts fail with previous data; verify preserved items and `fetchedAt` even as publications age beyond 30 days, persistent `stale: true`, no searches during that wait, renewed attempts afterward and later recovery, and document this behavior.
- [x] 2.6 Ensure both-attempt failures without previous data return an error without caching it and release the in-flight operation; verify a later request starts a new search, a replacement instance follows the same no-cache path and successful recovery is cached.

## 3. Access and operational configuration

- [x] 3.1 Configure both production CORS origins and verify allowed and unrelated origins using local HTTP tests, including browser preflight behavior.
- [x] 3.2 Add configurable per-IP request limits and a 429 response with defaults of 30 requests per 60000 milliseconds; verify independent IP allowances and window expiry using configured test values.
- [x] 3.3 Adapt trusted client-IP identification for direct Cloud Run access and bypass IP limiting when the IP is unreliable; verify trusted/untrusted forwarded information and no shared unknown identity through local HTTP tests, and document the trust assumptions and per-instance limitation.
- [x] 3.4 Update API and environment documentation for the revised search, cache behavior, literal links, IP fallback, current backend URL and agreed rate settings; verify the documented configuration matches the implementation and contains no secrets.

- [ ] 3.5 Update the API contract, README and environment example for the new query, exact provider parameters and thumbnail mapping/fallback; verify documentation matches the implementation and explains how existing query overrides affect rollout.

## 4. Common API errors

- [x] 4.1 Standardize errors across all API endpoints with `statusCode` and a sanitized public `message`, including generic 503 news failures and 429 visitor limits; verify provider/connection/quota failures without cache, errors on other routes, unexpected internal errors, credential/internal-detail redaction and preserved HTTP statuses, and document the common format.

## 5. Explicit unit coverage

- [x] 5.1 Add an isolated NewsService unit suite using its public operation, a fake provider and controlled time; verify selection/date boundaries, optional fields, literal links/deduplication, count/empty results, one retry, concurrency, cache/stale deadlines and no-cache recovery with `npm test`.
- [x] 5.2 Extend TavilySearchService unit tests for default/configured queries, missing key, non-success HTTP responses, invalid JSON/response structure, network errors and deterministic timeout cancellation without leaking details; verify `npm test` and avoid real provider calls.
- [x] 5.3 Add ClientIpService unit tests for direct socket IPs, trusted forwarded IPs, untrusted prefixes, missing/invalid headers and IPv4/IPv6 normalization; verify the isolated suite passes without an HTTP server.
- [x] 5.4 Add NewsRateLimitGuard unit tests for defaults/overrides, independent counters, exact expiry, 429, unreliable-IP bypass and invalid limit/window values including zero, negatives, fractions and nonnumeric strings; verify `npm test`.
- [x] 5.5 Add ApiExceptionFilter unit tests for the common JSON shape, preserved statuses, generic 503/500 and redaction of internal details/credentials/stack traces; verify the isolated suite passes without an HTTP server.

## 6. Integration verification

- [ ] 6.1 Run build, lint, unit and local HTTP suites after the provider-query and thumbnail updates; confirm both test commands pass, the existing greeting endpoint works and the revised news/thumbnail contract is covered.

## Workflow follow-up

- Playwright setup, deployed-service availability/CORS tests and their deployment integration are outside this change and are not completion criteria. Plan them separately if needed.
- Verify actual client-IP and rate-limit behavior in the deployed Cloud Run environment separately; run stress and multiple-IP tests later.
