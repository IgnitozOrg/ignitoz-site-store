# OpenSpec Adoption News Specification

## Purpose

Provide Ignitoz visitors with a shared selection of publications related to OpenSpec, with explicit freshness, availability and access behavior. A publication does not by itself confirm organizational adoption of OpenSpec.

## Requirements

### Requirement: Public fixed news query
The system SHALL expose unauthenticated `GET /news/openspec-adoption` using one server-configured search for OpenSpec publications. The system SHALL use a nonempty configured query unchanged and otherwise fall back to exactly `"openspec"`. Client inputs SHALL NOT alter the search or force a refresh.

#### Scenario: A visitor requests news
- **WHEN** a visitor requests the news endpoint
- **THEN** the system returns the selection without requiring authentication

#### Scenario: A server query is configured
- **WHEN** the configured query is `"Companies sharing their experience adopting OpenSpec in production"`
- **THEN** the search uses that exact phrase unchanged, rather than the `"openspec"` fallback

#### Scenario: The server query is absent or empty
- **WHEN** the server query is absent or an empty string
- **THEN** the search uses exactly `"openspec"` without adding another default phrase

#### Scenario: A client supplies search controls
- **WHEN** a client supplies parameters intended to change the query, period, result count or refresh behavior
- **THEN** those parameters do not alter the server's search or force a refresh

### Requirement: Publication response fields
Each returned publication SHALL contain `title`, `url`, `excerpt`, `publishedAt` and `thumbnailUrl`. Missing non-date fields SHALL be returned as empty strings. Supplied links SHALL be preserved as received, and missing non-date fields SHALL NOT make a publication ineligible.

#### Scenario: A publication has missing fields
- **WHEN** a publication has an eligible date but lacks a title, link or excerpt
- **THEN** it remains eligible and its missing fields are empty strings

#### Scenario: The provider supplies an invalid link
- **WHEN** an eligible publication includes an invalid link
- **THEN** the response preserves that link rather than dropping the publication or replacing the supplied value

### Requirement: Publication date eligibility
When selecting a new result, the system SHALL include only publications with usable provider-supplied dates within the preceding seven days and not later than the query time. The system SHALL NOT invent missing dates or substitute retrieval timestamps for publication dates.

#### Scenario: A publication has no usable date
- **WHEN** a search result has a missing or unusable publication date
- **THEN** it is excluded from the new selection

#### Scenario: The provider returns an old publication
- **WHEN** a result is older than the preceding seven days despite the requested period
- **THEN** it is excluded from the new selection

#### Scenario: Publication dates meet the weekly boundaries
- **WHEN** publication dates equal the query time or exactly seven times 24 hours before it
- **THEN** both are eligible, while dates just outside that inclusive interval are excluded

#### Scenario: The provider returns a future publication
- **WHEN** a result has a publication date later than the query time
- **THEN** it is excluded from the new selection

### Requirement: Single-search selection
The system SHALL select at most ten eligible publications from a single successful search, ordered newest first. It SHALL NOT perform a complementary search to fill the list. Duplicate available original links SHALL identify duplicate publications; publications without links SHALL remain distinct.

#### Scenario: More than ten eligible publications are returned
- **WHEN** the provider returns more than ten eligible publications
- **THEN** the response contains the ten newest eligible publications

#### Scenario: Fewer than ten publications are available
- **WHEN** the successful search yields fewer than ten eligible publications
- **THEN** the system returns the available selection without performing a complementary search

#### Scenario: Publications share an available link
- **WHEN** eligible results have the same available original link
- **THEN** the selection contains at most one publication for that link

#### Scenario: Publications have no links
- **WHEN** several eligible results have no link
- **THEN** they are not treated as duplicates merely because their links are empty

### Requirement: Successful empty results
The system SHALL return a successful response with `items: []` when the search succeeds but no publications are eligible. Empty success SHALL be cached like a nonempty successful selection.

#### Scenario: No eligible publications are found
- **WHEN** the search succeeds and finds no eligible publications
- **THEN** the response is an empty success and subsequent requests reuse it during the cache period

### Requirement: Successful result freshness
The system SHALL include `items`, `fetchedAt` and `stale` in the response, with ISO 8601 publication and retrieval timestamps. A successful selection SHALL be shared for 24 hours by visitors served by the same instance, with `stale: false` and an unchanged `fetchedAt` during that period.

#### Scenario: A successful selection is still fresh
- **WHEN** another visitor requests news within 24 hours of a successful retrieval on the same instance
- **THEN** the same selection and retrieval timestamp are returned as fresh without another provider search

#### Scenario: A successful selection expires
- **WHEN** a request arrives after the successful selection's 24-hour reuse period
- **THEN** it triggers a search, and success replaces the selection and retrieval timestamp with `stale: false`

### Requirement: Instance-local cache lifecycle
The system SHALL share successful selections only within the instance holding them. Cached data SHALL NOT be required to survive a process restart or be shared across instances. A replacement instance without a successful result SHALL follow the no-cache behavior.

#### Scenario: The instance restarts
- **WHEN** a request reaches a replacement instance that has no cached successful result
- **THEN** it initiates retrieval and uses the no-cache error behavior if both attempts fail

### Requirement: One provider retry
If a provider request fails, the system SHALL retry the same fixed request exactly once. A successful request, including one returning no eligible publications, SHALL NOT trigger a retry. Failure of both attempts SHALL use the fallback or error behavior defined below.

#### Scenario: The first request succeeds
- **WHEN** the initial provider request succeeds, including an empty selection
- **THEN** no retry or complementary search is performed

#### Scenario: The retry succeeds
- **WHEN** the first provider request fails and its retry succeeds
- **THEN** the successful result is returned and cached without another provider request

#### Scenario: Both attempts fail
- **WHEN** a provider request and its single retry fail
- **THEN** the system makes no further attempt in that refresh operation

### Requirement: Concurrent refresh sharing
The system SHALL share one refresh operation, including its single retry when required, among concurrent requests to the same instance.

#### Scenario: Concurrent requests require a refresh
- **WHEN** multiple requests arrive during an initial search or an expired-result refresh
- **THEN** they share that search and any retry rather than initiating duplicate refreshes

### Requirement: Stale fallback and renewed wait
If both attempts fail and a previous successful result exists, the system SHALL preserve all its publication data and original `fetchedAt`, return it with `stale: true`, and wait another 24 hours before a later request may query the provider. Repeated failures SHALL retain the same behavior without a maximum stale age.

#### Scenario: A refresh fails with previous data
- **WHEN** a refresh and its retry fail after a prior successful retrieval
- **THEN** the previous selection is returned as stale with its original retrieval timestamp, even if its publications have since aged beyond seven days

#### Scenario: A visitor arrives during the renewed wait
- **WHEN** a request arrives within 24 hours after the failed refresh
- **THEN** it receives the same stale selection and timestamp without another provider search

#### Scenario: The renewed wait expires
- **WHEN** a request arrives after the renewed 24-hour wait
- **THEN** it triggers a new search with one retry if needed, and a further failure preserves the prior data and starts another 24-hour wait

### Requirement: Unavailable news without cached data
If both provider attempts fail and no previous successful result exists, the system SHALL return HTTP 503 with a generic public service-unavailable message. It SHALL NOT cache the error; the next request SHALL be allowed to start a new search with one retry if needed.

#### Scenario: Initial retrieval fails
- **WHEN** the initial provider request and its retry fail without a prior result
- **THEN** the endpoint returns a generic 503 rather than an empty success or fabricated news

#### Scenario: A new visitor arrives after a no-cache failure
- **WHEN** a request arrives after a failed no-cache retrieval has completed
- **THEN** it initiates a new provider search rather than reusing the prior error

### Requirement: Common public API errors
All API endpoints SHALL use a common JSON error format containing `statusCode` and a public `message`. Public errors SHALL NOT disclose credentials or internal implementation details. Unavailable-news responses SHALL NOT reveal whether their cause is provider failure or exhausted quota.

#### Scenario: Provider failure or quota exhaustion occurs
- **WHEN** news cannot be obtained after both attempts and no cached result exists
- **THEN** the API returns the same generic 503 format without exposing the provider, quota state or credentials

#### Scenario: An API error occurs outside the news route
- **WHEN** another API endpoint returns an error
- **THEN** the response uses the same JSON error structure and does not disclose internal details

#### Scenario: An unexpected server error occurs
- **WHEN** an API request fails with an unexpected internal error
- **THEN** its server-error response uses the common format with a generic public message and exposes no internal error text or credentials

### Requirement: Provider credential confidentiality
The system MUST keep the Tavily credential on the server and MUST NOT expose it in successful or error responses.

#### Scenario: Responses are returned
- **WHEN** the endpoint returns news or reports an error
- **THEN** the response does not contain the Tavily API key

### Requirement: Per-IP request limits
The system SHALL enforce a configurable per-instance allowance and window for reliably identified client IPs, defaulting to 30 requests per minute, and return HTTP 429 using the common API error format when the allowance is exceeded.

#### Scenario: One IP exceeds its allowance
- **WHEN** a reliably identified client IP exceeds the configured allowance within its window
- **THEN** its excess request receives HTTP 429 in the common error format

#### Scenario: Another IP makes a request
- **WHEN** one IP exhausts its allowance and another reliably identified IP makes a request
- **THEN** the second IP is evaluated against its own allowance

#### Scenario: The window expires
- **WHEN** a client's rate-limit window expires
- **THEN** later requests are evaluated against a renewed allowance

### Requirement: Unreliable client IP availability
The system SHALL identify the visitor IP from trusted request information for direct access to the deployed service. If a reliable client IP cannot be established, it SHALL continue normal news handling without applying an IP limit to that request or assigning an invented shared identity.

#### Scenario: Client IP cannot be established reliably
- **WHEN** a request has no reliably identifiable visitor IP
- **THEN** the system serves available news without rejecting it or consuming an allowance under a shared unknown IP

#### Scenario: A client supplies untrusted forwarded information
- **WHEN** a client supplies forwarded-IP values that are not trusted by the deployed request path
- **THEN** those values do not establish the identity used for the per-IP limit

### Requirement: Production browser origins
The system SHALL allow browser cross-origin access from `https://ignitoz.com` and `https://www.ignitoz.com` without granting that access to unrelated origins.

#### Scenario: An allowed production origin requests news
- **WHEN** a browser request originates from either allowed production origin
- **THEN** the response permits that origin through CORS

#### Scenario: An allowed origin sends a preflight
- **WHEN** an allowed origin sends a browser preflight for the news request
- **THEN** the response grants the required CORS permission

#### Scenario: An unrelated origin requests news
- **WHEN** a browser request originates from an unrelated origin
- **THEN** the response does not grant that origin CORS access, without implying that direct HTTP calls must be rejected


### Requirement: Isolated unit verification
The change SHALL provide automated unit tests for news behavior, provider failures, client-IP identification, rate limits and public error formatting, in addition to HTTP integration tests. Unit tests SHALL use controlled dependencies and time without opening HTTP servers or calling real external services, and SHALL verify public behavior rather than private implementation details.

#### Scenario: News behavior is verified in isolation
- **WHEN** the news unit suite exercises successful, empty, invalid-date, retry, concurrent, fresh-cache, stale-cache and no-cache paths
- **THEN** it verifies the specified outputs and provider call counts, including optional fields, links, deduplication, data preservation and recovery

#### Scenario: Provider failure handling is verified in isolation
- **WHEN** the provider unit suite exercises missing credentials, default/configured queries, non-success HTTP responses, invalid JSON/response structure, network failure and timeout cancellation
- **THEN** it verifies configured requests and sanitized failure behavior without real provider calls, including cancellation rather than only the presence of a timeout signal

#### Scenario: Client identity is verified in isolation
- **WHEN** the client-IP unit suite receives direct, trusted-forwarded, untrusted-prefix, missing/invalid-header and equivalent-address cases
- **THEN** it verifies the trusted identity or unavailable-identity result and address normalization without an HTTP server

#### Scenario: Rate-limit configuration and behavior are verified in isolation
- **WHEN** the limiter unit suite exercises defaults, overrides, separate IPs, exact window boundaries, unreliable IPs and invalid limit/window values
- **THEN** it verifies the allowance and 429 behavior, bypass for unreliable IPs and rejection of zero, negative, fractional and nonnumeric configuration

#### Scenario: Public errors are verified in isolation
- **WHEN** the error-formatting unit suite exercises known HTTP errors, unavailable service and unexpected internal failures
- **THEN** it verifies the common JSON shape, preserved statuses, generic public messages and absence of credentials, internal details and stack traces


### Requirement: News retrieval constraints
The system SHALL retrieve news using advanced search depth, requesting at most ten provider results and source-related images while excluding `reddit.com`, `github.com`, `instagram.com`, `youtube.com`, `facebook.com`, `udemy.com`, `coursera.org`, `platzi.com`, `edx.org`, `codely.com`, `tavily.com`, `pi.dev`, `signadot.com`, `alagesanpalani.com` and `github.io` through the provider filter. Retrieval SHALL target the preceding week and request publication dates, with local eligibility checks.

#### Scenario: News retrieval is requested
- **WHEN** a refresh or its retry requests publications
- **THEN** the search targets news with advanced depth, requests at most ten results and associated images, and applies the full 15-domain exclusion list specified above

#### Scenario: Publication-date controls remain active
- **WHEN** publications are requested from the provider
- **THEN** the search targets the preceding week with publication dates requested and local date eligibility remains enforced

#### Scenario: Filtering leaves fewer results
- **WHEN** the provider returns at most ten results and local eligibility or deduplication removes some
- **THEN** the response contains only the remaining selection without a complementary search

### Requirement: Source-related thumbnail URLs
Each publication SHALL expose `thumbnailUrl` as the first nonempty image URL available in that publication's image list, or an empty string when unavailable. Missing or malformed image metadata SHALL NOT exclude an otherwise eligible publication. Images from query-level lists or other publications SHALL NOT be assigned as its thumbnail.

#### Scenario: A publication has source images
- **WHEN** an eligible publication has several image entries, including entries without nonempty URL strings
- **THEN** its thumbnail is the first nonempty URL string in that publication's image list

#### Scenario: A publication has no available image URL
- **WHEN** image metadata is missing, empty or malformed, or no image entry contains a nonempty URL string
- **THEN** the publication remains in the selection with `thumbnailUrl: ""`

#### Scenario: Only query-level images are available
- **WHEN** query-level images exist but a publication has no source-related image URL
- **THEN** its `thumbnailUrl` is empty instead of assigning an unrelated image

#### Scenario: Cached thumbnails are returned
- **WHEN** cached news is reused or returned as stale after a failed refresh
- **THEN** each thumbnail remains associated with its original publication and is preserved with the rest of the cached data
