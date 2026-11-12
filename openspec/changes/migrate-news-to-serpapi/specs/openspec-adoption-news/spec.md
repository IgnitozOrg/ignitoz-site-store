# Spec Delta

## MODIFIED Requirements

### Requirement: Public fixed news query
The system SHALL expose unauthenticated `GET /news/openspec-adoption` with one server-configured OpenSpec search. A result SHALL NOT imply confirmed organizational adoption. A nonempty configured query SHALL be used as the base query; absent or empty configuration SHALL fall back to `openspec`. The system SHALL append ` -site:github.com` to the base query. Client inputs SHALL NOT alter the search or force a refresh.

#### Scenario: A visitor requests news
- **WHEN** a visitor requests the news endpoint
- **THEN** the system returns the results without requiring authentication

#### Scenario: A server query is configured
- **WHEN** a nonempty query is configured
- **THEN** it is sent to the provider with ` -site:github.com` appended

#### Scenario: The server query is absent or empty
- **WHEN** the query is absent or empty
- **THEN** the provider receives `openspec -site:github.com`

#### Scenario: A client supplies search controls
- **WHEN** a client supplies query, period, count or refresh controls
- **THEN** the server search and cache are unaffected

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
The response SHALL contain `items`, ISO 8601 `fetchedAt` and `stale`. Publication dates SHALL be expressed as ISO 8601 timestamps. Successful results SHALL be shared for 24 hours per instance with `stale: false` and an unchanged `fetchedAt`.

#### Scenario: A successful result is fresh
- **WHEN** another visitor requests news within 24 hours of a successful retrieval on the same instance
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

### Requirement: Provider credential confidentiality
The system MUST keep the SerpApi credential on the server and MUST NOT expose it in successful or error responses, nor log credential-bearing URLs.

#### Scenario: Responses are returned
- **WHEN** the endpoint returns results or an error
- **THEN** the response does not contain the SerpApi API key

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
