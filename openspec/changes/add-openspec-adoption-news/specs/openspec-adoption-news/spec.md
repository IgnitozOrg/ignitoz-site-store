# Spec Delta

## Purpose

Provide a public, shared selection of publications about organizational adoption of Fission-AI's OpenSpec, with freshness and availability information.

## ADDED Requirements

### Requirement: Public fixed news query
The system SHALL provide an unauthenticated, on-demand news endpoint using a server-configured query about organizational adoption of Fission-AI's OpenSpec, oriented toward Spanish and English publications.

#### Scenario: A visitor requests news
- **WHEN** a visitor requests the news endpoint
- **THEN** the system returns the shared news selection without requiring authentication

#### Scenario: A client supplies search controls
- **WHEN** a client supplies parameters intended to change the query, period, result count, or force a refresh
- **THEN** those parameters do not alter the server's search or force a refresh

### Requirement: Publication fields and dates
The system SHALL return each eligible publication's title, original link, excerpt, and usable publication date supplied by the search provider.

#### Scenario: A publication has no usable date
- **WHEN** a search result has no usable provider-supplied publication date
- **THEN** it is excluded rather than assigned an invented date or the retrieval date

### Requirement: Recent and older publication selection
The system SHALL prioritize publications from the last 30 days, seek older publications if needed, and return at most ten eligible publications in descending publication-date order.

#### Scenario: Recent publications fill the selection
- **WHEN** at least ten eligible recent publications are available
- **THEN** the response contains at most ten publications ordered newest first

#### Scenario: Recent publications do not fill the selection
- **WHEN** fewer than ten eligible recent publications are available
- **THEN** the system also searches for older publications and returns available eligible results, newest first, up to ten

#### Scenario: Fewer than ten eligible publications exist
- **WHEN** the searches yield fewer than ten eligible publications
- **THEN** the response contains only those available without an indefinite search for more

### Requirement: Successful empty results
The system SHALL return a successful response with an empty list when the search succeeds but finds no eligible publications.

#### Scenario: No eligible publications are found
- **WHEN** the provider searches succeed and no eligible publications are found
- **THEN** the response contains an empty list and is distinguishable from a provider error

### Requirement: Shared result freshness
The system SHALL reuse the last successful result for 24 hours from its retrieval time for all visitors served by the same instance, and include its retrieval timestamp and freshness status in responses.

#### Scenario: Result is still fresh
- **WHEN** another visitor requests news within 24 hours of a successful retrieval on the same instance
- **THEN** the same selection and retrieval timestamp are returned as fresh without another provider search

#### Scenario: Result expires
- **WHEN** a request arrives after the cached result expires
- **THEN** it triggers a new search and a successful response carries the new retrieval timestamp

### Requirement: Concurrent refresh sharing
The system SHALL share one refresh operation among concurrent requests to the same instance, including any complementary search for older publications.

#### Scenario: Concurrent requests require a refresh
- **WHEN** multiple requests arrive while the initial search or an expired-result refresh is in progress
- **THEN** they share that operation rather than initiating duplicate refreshes

### Requirement: Provider failure fallback
The system SHALL return the last successful result marked stale when a provider search fails and a previous result exists; otherwise it SHALL return a clear error.

#### Scenario: Failure with a previous result
- **WHEN** a refresh fails after a successful retrieval
- **THEN** the previous selection is returned as stale with its original retrieval timestamp

#### Scenario: Failure without a previous result
- **WHEN** the provider fails before any successful retrieval
- **THEN** the response is an error rather than an empty success or fabricated news

### Requirement: Provider credential confidentiality
The system MUST keep the Tavily credential on the server and MUST NOT expose it in successful or error responses.

#### Scenario: Responses are returned
- **WHEN** the endpoint returns news or reports an error
- **THEN** the response does not contain the Tavily API key

### Requirement: Per-IP request limits
The system SHALL enforce a configurable request allowance and time window per client IP and return HTTP 429 when that allowance is exceeded.

#### Scenario: One IP exceeds its allowance
- **WHEN** a client IP exceeds the configured allowance within its window
- **THEN** its excess request receives HTTP 429

#### Scenario: Another IP makes a request
- **WHEN** one IP exhausts its allowance and another IP makes a request
- **THEN** the second IP is evaluated against its own allowance

### Requirement: Production browser origins
The system SHALL allow browser cross-origin access from `https://ignitoz.com` and `https://www.ignitoz.com` without granting that access to unrelated origins.

#### Scenario: An allowed production origin requests news
- **WHEN** a browser request originates from either allowed production origin
- **THEN** the response permits that origin through CORS

#### Scenario: An unrelated origin requests news
- **WHEN** a browser request originates from an unrelated origin
- **THEN** the response does not grant that origin CORS access
