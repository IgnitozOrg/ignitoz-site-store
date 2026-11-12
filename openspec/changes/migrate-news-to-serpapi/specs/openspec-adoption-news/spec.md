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
The `items` array SHALL contain the provider's `organic_results` objects unchanged, retaining all their supplied fields and missing fields without inventing values. Consumers SHALL use the provider-native contract rather than the previous normalized publication fields.

#### Scenario: An organic result has fields
- **WHEN** SerpApi returns an organic result with a title, link, date, snippet, source or additional nested fields
- **THEN** the returned item preserves all those fields and their values

#### Scenario: An organic result has no date
- **WHEN** an organic result lacks a date
- **THEN** it remains in the response without an invented date

#### Scenario: A publication has missing fields
- **WHEN** a result lacks fields
- **THEN** the result is retained unchanged without inventing them

#### Scenario: The provider supplies an invalid link
- **WHEN** a result has a supplied link
- **THEN** the link is preserved unchanged

### Requirement: Publication date eligibility
The system SHALL request a three-month period through the provider using `tbs=qdr:m3`. It SHALL NOT discard or alter returned organic results based on local date checks. Provider filtering SHALL NOT be presented as a guarantee that each item's displayed date falls within that interval.

#### Scenario: The provider request is sent
- **WHEN** a search is requested
- **THEN** the provider receives `tbs=qdr:m3`

#### Scenario: A result has an old, future, or missing date
- **WHEN** the provider nevertheless returns such a result
- **THEN** the system preserves it unchanged

#### Scenario: A publication has no usable date
- **WHEN** a result lacks a usable date
- **THEN** it is preserved without an invented date

#### Scenario: The provider returns an old publication
- **WHEN** a provider result has an older date
- **THEN** it is preserved without local date filtering

#### Scenario: Publication dates meet the weekly boundaries
- **WHEN** results have dates around a former weekly boundary
- **THEN** all are preserved unchanged

#### Scenario: The provider returns a future publication
- **WHEN** a provider result has a future date
- **THEN** it is preserved unchanged

### Requirement: Single-search selection
The system SHALL return the `organic_results` from one successful search in provider order, including duplicate links, without a complementary search or local result cap.

#### Scenario: The provider returns organic results
- **WHEN** the search succeeds with organic results
- **THEN** `items` equals the provider's array in the same order

#### Scenario: Results have duplicate links
- **WHEN** multiple organic results have the same link
- **THEN** all results are retained

#### Scenario: More than ten eligible publications are returned
- **WHEN** more than ten results are returned
- **THEN** all are returned in provider order

#### Scenario: Fewer than ten publications are available
- **WHEN** fewer than ten results are returned
- **THEN** all are returned without an additional search

#### Scenario: Publications share an available link
- **WHEN** results share a link
- **THEN** all are retained in their original order

#### Scenario: Publications have no links
- **WHEN** results have no links
- **THEN** they are preserved unchanged

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
The response SHALL contain `items`, ISO 8601 `fetchedAt` and `stale`. Organic result fields, including dates, SHALL remain in their provider-supplied format. Successful results SHALL be shared for 24 hours per instance with `stale: false` and an unchanged `fetchedAt`.

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
The system SHALL preserve image and favicon metadata exactly as supplied within each organic result and SHALL NOT assign query-level images or invent a `thumbnailUrl` field.

#### Scenario: An organic result lacks a thumbnail
- **WHEN** a result has no thumbnail
- **THEN** the result remains unchanged without an invented thumbnail

#### Scenario: A publication has source images
- **WHEN** a result contains image fields
- **THEN** the supplied fields are preserved unchanged

#### Scenario: A publication has no available image URL
- **WHEN** a result has no image fields
- **THEN** it is preserved without invented image fields

#### Scenario: Only query-level images are available
- **WHEN** only query-level images exist
- **THEN** they are not assigned to individual items

#### Scenario: Cached thumbnails are returned
- **WHEN** cached items contain image fields
- **THEN** those fields remain unchanged

### Requirement: Isolated unit verification
The change SHALL provide isolated unit and HTTP tests for provider requests, provider-native organic results, caching, errors, access, CORS and rate limiting. Unit tests SHALL use controlled dependencies and time without opening HTTP servers or calling external services.

#### Scenario: Provider behavior is verified
- **WHEN** provider tests cover configured and fallback queries, the three-month filter and GitHub exclusion, empty and malformed results, failures and timeout cancellation
- **THEN** they verify requests and sanitized outcomes without real provider calls

#### Scenario: Result and availability behavior is verified
- **WHEN** unit and HTTP tests exercise organic results, empty success, caching, retries, concurrency and stale fallback
- **THEN** they verify provider fields and order remain unchanged and availability behavior is preserved

#### Scenario: News behavior is verified in isolation
- **WHEN** unit tests exercise results, cache, retries and recovery
- **THEN** they verify provider-native items and availability behavior

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
