# Tasks

## 1. Provider integration and selection

- [ ] 1.1 Add server-side Tavily credential and fixed-query configuration, with an injectable Search adapter and bounded timeout; verify provider requests and failures using deterministic mocks without exposing the key.
- [ ] 1.2 Implement recent search and the bounded older-results search, normalize and deduplicate results, exclude unusable dates, sort and cap the selection; verify through HTTP tests covering recent priority, complementary results, duplicates, missing dates, fewer than ten and an empty result.
- [ ] 1.3 Perform and document an exploratory Tavily search using a configured credential; record actual relevance, publication dates, Spanish/English coverage and period-filter behavior without recording the credential.

## 2. News endpoint and availability

- [ ] 2.1 Expose the public `GET /news/openspec-adoption` response contract and generic provider error; verify fields, ISO dates, empty success, ignored client search controls and credential redaction through HTTP tests.
- [ ] 2.2 Implement the per-instance 24-hour cache and on-demand atomic refresh; use controlled-time HTTP tests to verify reuse across clients, expiry, successful renewal and caching of empty results.
- [ ] 2.3 Share each in-flight refresh, including its complementary search, across concurrent requests; verify provider call counts and responses for concurrent initial and expired-cache requests.
- [ ] 2.4 Preserve and mark the last successful result stale on either search failure, or return 503 without prior data; verify timestamps remain unchanged, partial results are not cached and subsequent requests can retry.

## 3. Access and operational configuration

- [ ] 3.1 Configure the two production CORS origins and verify allowed and unrelated origins using HTTP tests, including browser preflight behavior.
- [ ] 3.2 Add configurable per-IP request limits and a 429 response; verify independent IP allowances, window expiry and configured test values through HTTP tests.
- [ ] 3.3 Document the API contract, environment configuration, pre-deployment choice of rate-limit values, proxy-trust requirements and per-instance cache limitations; verify the documented settings match the implementation and do not contain secrets.

## 4. Integration verification

- [ ] 4.1 Run the project build, lint and relevant automated tests; confirm the existing greeting endpoint and the complete news HTTP workflow still pass.
- [ ] 4.2 Verify the configured proxy and CORS behavior in the intended deployment environment before release; record the chosen limit and window and the verification results.
