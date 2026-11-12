# OpenSpec Adoption News Specification

## Purpose

Provide Ignitoz visitors with a shared selection of publications related to OpenSpec, with explicit freshness, availability and access behavior. A publication does not by itself confirm organizational adoption of OpenSpec.

## Requirements

### Requirement: Public fixed news query
The system SHALL expose unauthenticated `GET /news?topic=openspec`. The `topic` query parameter SHALL be required and SHALL contain exactly one case-sensitive identifier registered in the backend. Initially only `openspec` SHALL be enabled. Missing, empty, repeated, non-string or disabled topic values SHALL return HTTP 400 using the common public error format without calling the provider or serving cached news. The backend SHALL map each enabled topic to a server-owned search query; client input SHALL NOT enable topics or supply provider queries. The former `/news/openspec-adoption` route SHALL return HTTP 404. A result SHALL NOT imply confirmed organizational adoption. For `openspec`, a nonempty `OPENSPEC_NEWS_QUERY` SHALL be used as the base query; absent or empty configuration SHALL fall back to `openspec`. The system SHALL append ` -site:github.com` to the base query. Client `query`, `period`, `count` or `refresh` inputs SHALL NOT alter the configured query or force a refresh.

#### Scenario: A visitor requests news
- **WHEN** a visitor requests the news endpoint with an enabled topic
- **THEN** the system returns the results without requiring authentication

#### Scenario: A server query is configured
- **WHEN** a nonempty query is configured
- **THEN** it is sent to the provider with ` -site:github.com` appended

#### Scenario: The server query is absent or empty
- **WHEN** the query is absent or empty
- **THEN** the provider receives `openspec -site:github.com`

#### Scenario: A client supplies search controls
- **WHEN** a client supplies query, period, count or refresh controls along with a valid topic
- **THEN** the server search and cache are unaffected

#### Scenario: The topic is missing or empty
- **WHEN** the request omits `topic` or supplies an empty value
- **THEN** the endpoint returns a generic 400 without a provider call

#### Scenario: The topic is disabled
- **WHEN** the request supplies a topic not registered in the backend
- **THEN** the endpoint returns a generic 400 even if another topic has cached news

#### Scenario: The topic is repeated or malformed
- **WHEN** the request supplies multiple topic values or a non-string value
- **THEN** the endpoint returns a generic 400 without a provider call

#### Scenario: An enabled topic is selected
- **WHEN** the request supplies exactly one registered topic identifier
- **THEN** the backend uses that topic's server-owned query and cache

#### Scenario: The former route is requested
- **WHEN** a client requests `/news/openspec-adoption`
- **THEN** the API returns HTTP 404

### Requirement: Publication response fields
The `items` array SHALL contain objects with string fields `title`, `url`, `excerpt`, `publishedAt`, and `thumbnailUrl`. Map provider `title`, `link`, `snippet`, and `thumbnail` to the corresponding public fields; use empty strings for missing or non-string text fields.

#### Scenario: A provider result has publication fields
- **WHEN** the provider returns title, link, snippet, date and thumbnail
- **THEN** the response maps them to the public fields and returns an ISO 8601 `publishedAt`

#### Scenario: A publication has missing text or image fields
- **WHEN** a result lacks a text or thumbnail field
- **THEN** the corresponding public field is an empty string

#### Scenario: A publication has missing fields
- **WHEN** A result lacks text or thumbnail fields
- **THEN** The corresponding public fields are empty strings

#### Scenario: The provider supplies an invalid link
- **WHEN** A result has a supplied link string
- **THEN** The link is returned as `url` unchanged

### Requirement: Publication date eligibility
The system SHALL request a three-month period using `tbs=qdr:m3` without local date-window filtering. It SHALL convert supported absolute dates to ISO 8601, treating date-only values as UTC. It SHALL convert relative minutes, hours, days, weeks and months to estimated ISO timestamps based on retrieval time, clamping month subtraction to the last valid calendar day. It SHALL omit results with missing or unparseable dates. Relative timestamps are estimates, not exact publication times.

#### Scenario: The provider request is sent
- **WHEN** a search is requested
- **THEN** the provider receives `tbs=qdr:m3`

#### Scenario: A result has an absolute date
- **WHEN** a result has a supported date
- **THEN** `publishedAt` is the corresponding ISO 8601 timestamp

#### Scenario: A result has a relative date
- **WHEN** a result has a supported relative date such as `3 days ago`
- **THEN** `publishedAt` is estimated from the retrieval timestamp

#### Scenario: A result has no usable date
- **WHEN** a result has a missing or unparseable date
- **THEN** it is omitted

#### Scenario: A result falls outside the provider period
- **WHEN** the provider returns a result with an old or future date
- **THEN** no local date-window filtering excludes it

#### Scenario: A publication has no usable date
- **WHEN** A result lacks a parseable date
- **THEN** The result is omitted

#### Scenario: The provider returns an old publication
- **WHEN** A result has an old but parseable date
- **THEN** The result is not excluded by a local date window

#### Scenario: Publication dates meet the weekly boundaries
- **WHEN** Results have dates around a former weekly boundary
- **THEN** The results are not excluded by a local date window

#### Scenario: The provider returns a future publication
- **WHEN** A result has a future but parseable date
- **THEN** The result is not excluded by a local date window

### Requirement: Single-search selection
The system SHALL return mapped results with usable dates from one successful search in provider order, including duplicate links, without a complementary search or local result cap.

#### Scenario: Results have duplicate links
- **WHEN** valid results share a link
- **THEN** all are retained in provider order

#### Scenario: More than ten publications are returned
- **WHEN** more than ten results have usable dates
- **THEN** all are returned without a local cap

#### Scenario: Fewer publications are available
- **WHEN** fewer results are returned
- **THEN** no complementary search is made

#### Scenario: More than ten eligible publications are returned
- **WHEN** More than ten results have usable dates
- **THEN** All are returned in provider order

#### Scenario: Fewer than ten publications are available
- **WHEN** Fewer than ten results have usable dates
- **THEN** No complementary search is made

#### Scenario: Publications share an available link
- **WHEN** Multiple valid results share a link
- **THEN** All are retained in provider order

#### Scenario: Publications have no links
- **WHEN** A result with a usable date has no link
- **THEN** It is returned with an empty `url`

### Requirement: Successful empty results
The system SHALL return and cache a successful `items: []` when `organic_results` is absent without error or when Google Search returns its documented no-results message without `organic_results`. A present non-array `organic_results` or other provider error SHALL be treated as failure.

#### Scenario: The provider reports no organic results
- **WHEN** Google Search returns its documented no-results message with no `organic_results`
- **THEN** the response is an empty success without retry and subsequent requests reuse it during the cache period

#### Scenario: The provider returns a malformed array
- **WHEN** `organic_results` is present but is not an array
- **THEN** retrieval fails and follows the normal retry and fallback behavior

#### Scenario: No eligible publications are found
- **WHEN** Google Search reports no matching results
- **THEN** an empty success is cached without a retry

### Requirement: Successful result freshness
The response SHALL contain `items`, ISO 8601 `fetchedAt` and `stale`. Publication dates SHALL be expressed as ISO 8601 timestamps. Successful results SHALL be shared for 24 hours per topic per instance with `stale: false` and an unchanged `fetchedAt`.

#### Scenario: A successful result is fresh
- **WHEN** another visitor requests news for the same topic within 24 hours of a successful retrieval on the same instance
- **THEN** the same results and retrieval timestamp are returned without another provider search

#### Scenario: A successful result expires
- **WHEN** a request arrives after the 24-hour reuse period
- **THEN** it triggers a search and success replaces the result and timestamp

#### Scenario: A successful selection is still fresh
- **WHEN** another request arrives within the 24-hour reuse period
- **THEN** the cached response is returned without a provider search

#### Scenario: A successful selection expires
- **WHEN** the 24-hour reuse period has expired
- **THEN** a new search refreshes the result and timestamp

### Requirement: Instance-local cache lifecycle
The system SHALL share successful selections only within the instance holding them. Each enabled topic SHALL have independent cached data, freshness deadlines, and pending refresh state. Cached data SHALL NOT be required to survive a process restart or be shared across instances. A replacement instance without a successful result SHALL follow the no-cache behavior.

#### Scenario: The instance restarts
- **WHEN** a request reaches a replacement instance that has no cached successful result
- **THEN** it initiates retrieval and uses the no-cache error behavior if both attempts fail

#### Scenario: Enabled topics have cached news
- **WHEN** successful results are cached for multiple enabled topics
- **THEN** each topic reuses only its own results and timestamp

### Requirement: One provider retry
If a provider request fails, the system SHALL retry the same selected topic's server-owned request exactly once. A successful request, including one returning no eligible publications, SHALL NOT trigger a retry. Failure of both attempts SHALL use the fallback or error behavior defined below.

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
The system SHALL share one refresh operation, including its single retry when required, among concurrent requests for the same topic to the same instance. Requests for different enabled topics SHALL NOT share pending searches or retries.

#### Scenario: Concurrent requests require a refresh
- **WHEN** multiple requests for the same topic arrive during an initial search or an expired-result refresh
- **THEN** they share that search and any retry rather than initiating duplicate refreshes

#### Scenario: Different enabled topics refresh concurrently
- **WHEN** requests for different enabled topics require retrieval
- **THEN** each topic runs its own refresh and retry independently

### Requirement: Stale fallback and renewed wait
If both attempts fail and a previous successful result exists for the selected topic, the system SHALL preserve all its publication data and original `fetchedAt`, return it with `stale: true`, and wait another 24 hours before a later request may query the provider. Repeated failures SHALL retain the same behavior without a maximum stale age.

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
If both provider attempts fail and no previous successful result exists for the selected topic, the system SHALL return HTTP 503 with a generic public service-unavailable message. It SHALL NOT cache the error; the next request SHALL be allowed to start a new search with one retry if needed.

#### Scenario: Initial retrieval fails
- **WHEN** the initial provider request and its retry fail without a prior result
- **THEN** the endpoint returns a generic 503 rather than an empty success or fabricated news

#### Scenario: A new visitor arrives after a no-cache failure
- **WHEN** a request arrives after a failed no-cache retrieval has completed
- **THEN** it initiates a new provider search rather than reusing the prior error

#### Scenario: Only another topic has cached news
- **WHEN** both retrieval attempts fail for a topic without cached news
- **THEN** the API returns a generic 503 and does not substitute another topic's data

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
The system MUST keep the SerpApi credential on the server and MUST NOT expose it in successful or error responses, nor log credential-bearing URLs.

#### Scenario: Responses are returned
- **WHEN** the endpoint returns results or an error
- **THEN** the response does not contain the SerpApi API key

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
The change SHALL provide isolated unit and HTTP tests for provider requests, normalized publication results, caching, errors, access, CORS and rate limiting. Unit tests SHALL use controlled dependencies and time without opening HTTP servers or calling external services.

#### Scenario: Provider behavior is verified
- **WHEN** provider tests cover configured and fallback queries, the three-month filter and GitHub exclusion, empty and malformed results, failures and timeout cancellation
- **THEN** they verify requests and sanitized outcomes without real provider calls

#### Scenario: Result and availability behavior is verified
- **WHEN** unit and HTTP tests exercise organic results, empty success, caching, retries, concurrency and stale fallback
- **THEN** they verify public fields and provider order are preserved and availability behavior is preserved

#### Scenario: News behavior is verified in isolation
- **WHEN** unit tests exercise results, cache, retries and recovery
- **THEN** they verify normalized items and availability behavior

#### Scenario: Provider failure handling is verified in isolation
- **WHEN** unit tests exercise provider errors and timeout cancellation
- **THEN** they verify sanitized failures and cancellation

#### Scenario: Client identity is verified in isolation
- **WHEN** unit tests exercise trusted and untrusted client IP inputs
- **THEN** they verify correct identity and normalization

#### Scenario: Rate-limit configuration and behavior are verified in isolation
- **WHEN** unit tests exercise configuration and rate limiting
- **THEN** they verify limits and rejection of invalid settings

#### Scenario: Public errors are verified in isolation
- **WHEN** unit tests exercise public error formatting
- **THEN** they verify generic errors without exposing credentials

### Requirement: News retrieval constraints
The system SHALL request Google Search through SerpApi using `engine=google`, `hl=en`, the configured or fallback query with `-site:github.com` appended, and `tbs=qdr:m3`. It SHALL NOT make a complementary search.

#### Scenario: Retrieval is requested
- **WHEN** a refresh or retry requests results
- **THEN** the provider receives the base query with `-site:github.com` appended, Google engine, English language and three-month filter

#### Scenario: News retrieval is requested
- **WHEN** a refresh or retry requests results
- **THEN** the provider receives engine google, hl en, the base query with `-site:github.com` appended and tbs qdr:m3

#### Scenario: Publication-date controls remain active
- **WHEN** results are requested
- **THEN** the three-month provider filter is supplied without local date filtering

#### Scenario: Filtering leaves fewer results
- **WHEN** the provider returns fewer results
- **THEN** the response contains the provider results without a complementary search

### Requirement: Source-related thumbnail URLs
The system SHALL map a result's `thumbnail` string to `thumbnailUrl`, or use an empty string when absent or non-string. It SHALL NOT assign query-level images to individual results.

#### Scenario: A result has a thumbnail
- **WHEN** the provider supplies a thumbnail string
- **THEN** the response returns it as `thumbnailUrl`

#### Scenario: A result lacks a thumbnail
- **WHEN** a result lacks a thumbnail string
- **THEN** `thumbnailUrl` is empty

#### Scenario: Only query-level images are available
- **WHEN** only query-level images exist
- **THEN** they are not assigned to individual items

#### Scenario: A publication has source images
- **WHEN** A result has a thumbnail string
- **THEN** It is mapped to `thumbnailUrl`

#### Scenario: A publication has no available image URL
- **WHEN** A result has no thumbnail string
- **THEN** Its `thumbnailUrl` is empty

#### Scenario: Cached thumbnails are returned
- **WHEN** A cached item has a thumbnail URL
- **THEN** The cached URL is returned unchanged
