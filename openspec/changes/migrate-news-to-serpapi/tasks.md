# Tasks

## 1. SerpApi provider

- [ ] 1.1 Replace the Tavily adapter and module wiring with a SerpApi Google News adapter; verify mocked requests use the configured or fallback query, `hl=en`, the server credential and no exclusions.
- [ ] 1.2 Handle provider errors, malformed responses, timeouts and absent results; verify sanitized failures, timeout cancellation and empty-success behavior in isolated provider tests.
- [ ] 1.3 Update configuration and deployment documentation for `SERPAPI_API_KEY` and the existing query; verify documented environment names match the adapter.

## 2. Selection and contract

- [ ] 2.1 Normalize individual results and only the first story of each group; verify empty groups, an ineligible first story, missing fields and date boundaries in unit tests.
- [ ] 2.2 Select the newest publication per nonempty link and cap sorted results at 20; verify duplicate ordering, missing links and single-search behavior in unit tests.
- [ ] 2.3 Remove `excerpt` from the response type and normalization; verify the complete public response shape and field absence in unit and HTTP tests.

## 3. Availability and integration

- [ ] 3.1 Verify cached empty and nonempty results, shared concurrent refresh, retry, stale fallback, renewal and no-cache 503 behavior using controlled time and mocked provider responses.
- [ ] 3.2 Update HTTP integration tests for SerpApi and run the relevant unit and HTTP suites, including existing access, CORS, rate-limit and error-sanitization coverage.
- [ ] 3.3 Verify and record before deployment that identified consumers no longer depend on `excerpt`, and document the new credential and rollback prerequisites; flag any external consumer needing a separate update.

