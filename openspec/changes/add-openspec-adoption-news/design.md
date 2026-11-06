# Design

## Context

The NestJS application currently has a greeting endpoint, global environment configuration, and Supertest-based HTTP tests. See the proposal and `openspec-adoption-news` spec for scope and behavioral requirements. Each process is independent and has no shared cache.

## Goals / Non-Goals

**Goals:** Isolate the external search boundary, make refresh behavior deterministic under concurrency, and expose a stable HTTP contract suitable for the future frontend.

**Non-Goals:** Introduce persistent infrastructure, coordinate instances, or verify whether search results actually prove adoption.

## Decisions

### HTTP boundary

Add `GET /news/openspec-adoption` with a response shaped as `{ "items": [{ "title", "url", "excerpt", "publishedAt" }], "fetchedAt", "stale" }`; dates are ISO 8601 strings. An empty successful result uses `items: []`. Return HTTP 503 with a generic error when no successful result is available. Do not accept client controls over the search. A dedicated route keeps the contract explicit; exposing a general search endpoint would allow arbitrary provider usage.

### Search and selection

Use an injectable Tavily adapter over its Search HTTP API, with `TAVILY_API_KEY` kept server-side and a fixed query configurable through an environment variable with a code default. Request publication dates and use provider-supported date controls for a recent search; if fewer than ten eligible unique results remain, make one bounded complementary search that can include older publications. Normalize results, discard missing or invalid publication dates, deduplicate by original URL, sort newest first, and take ten. A failed complementary search fails the whole refresh so a partial result does not replace a previously successful selection.

The [Tavily Search API reference](https://docs.tavily.com/documentation/api-reference/endpoint/search) documents publication-date and date-range options as well as language controls. Verify their actual behavior, date availability, relevance, and Spanish/English coverage with a real query during implementation; do not infer missing dates or promise language coverage. A finite two-stage search limits cost and avoids indefinite attempts to fill the list. An LLM or independent verification is outside scope.

### Cache and concurrency

Keep one in-memory value containing the complete selection and successful retrieval timestamp, plus one in-flight refresh promise per process. Reuse a result while its age is less than 24 hours; at expiry, the first request starts a refresh and concurrent requests await the same promise. Atomically replace the value only after all required searches succeed, including an empty result; clear the in-flight promise on success or failure. On failure, preserve the old value and timestamp and return it as stale, or return 503 if none exists. A timeout on provider calls prevents an indefinitely held refresh. Persistent or distributed caching would add infrastructure outside the MVP.

### Access and configuration

Configure CORS for the two specified production origins and apply a configurable IP-based request limit to this endpoint, returning 429 when exceeded. Configure Express proxy trust only for the actual deployment's trusted proxies; never blindly trust forwarded headers. Select and validate the allowance and window before deployment. Keep provider errors and credentials out of client responses and redact sensitive request details from logs. CORS alone is not abuse protection, while an IP limiter does not provide a global spending cap.

### Verification

Exercise the real HTTP boundary using the existing Nest testing module, Vitest and Supertest, with an injected fake provider and controlled time. Cover selection, empty results, cache expiry, concurrent requests, successful and failed refreshes, CORS, per-IP limits and credential redaction. Separately run an exploratory real-provider query with a configured credential; do not put it in the normal automated suite.

## Risks / Trade-offs

- Provider results can omit dates or be irrelevant, and language/date filtering may be imperfect → discard undated results and validate real behavior; return fewer results rather than invent data.
- Multiple instances and restarts cause independent searches and inconsistent temporary selections → accept per-instance caching and monitor usage; there is no strict global cost cap.
- Repeated failed refreshes can cause repeated provider calls → use bounded timeouts and monitor failures; stale data retains its original timestamp.
- Incorrect proxy trust can collapse clients into one IP or allow spoofing → configure it for the actual deployment topology and test through that path before release.

## Migration Plan

Configure the provider key, fixed query if overridden, and agreed rate-limit values; verify proxy and CORS behavior in the target environment. Deploy the backend and perform the exploratory provider check, then enable frontend consumption in a separate change. Roll back the application release if needed; the in-memory cache requires no data migration or cleanup.
