# Spec Delta

## MODIFIED Requirements

### Requirement: Public fixed news query
The system SHALL expose unauthenticated `GET /news/openspec-adoption` for Ignitoz visitors to obtain publications related to OpenSpec. A returned publication SHALL NOT imply confirmed organizational adoption. The system SHALL use one server-configured search: a nonempty configured query unchanged or exactly `"openspec"` otherwise. Client inputs SHALL NOT alter the search or force a refresh.

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
Each returned publication SHALL contain `title`, `url`, `publishedAt` and `thumbnailUrl`. The endpoint SHALL stop returning `excerpt`, and consumers SHALL NOT rely on it. Missing non-date fields SHALL be empty strings. Supplied links SHALL be preserved as received, and missing non-date fields SHALL NOT make a publication ineligible.

#### Scenario: A publication has missing fields
- **WHEN** a publication has an eligible date but lacks a title, link or thumbnail
- **THEN** it remains eligible and its missing fields are empty strings

#### Scenario: The provider supplies an invalid link
- **WHEN** an eligible publication includes an invalid link
- **THEN** the response preserves that link rather than dropping the publication or replacing the supplied value

#### Scenario: A publication is returned
- **WHEN** a publication is returned by the endpoint
- **THEN** it has no `excerpt` field

### Requirement: Publication date eligibility
When selecting a new result, the system SHALL include only publications with a usable provider-supplied `iso_date` within the preceding seven days and not later than the query time. The system SHALL NOT invent missing dates or substitute retrieval timestamps for publication dates.

#### Scenario: A publication has no usable date
- **WHEN** a search result has a missing or unusable `iso_date`
- **THEN** it is excluded from the new selection

#### Scenario: The provider returns an old publication
- **WHEN** a result is older than the preceding seven days
- **THEN** it is excluded from the new selection

#### Scenario: Publication dates meet the weekly boundaries
- **WHEN** publication dates equal the query time or exactly seven times 24 hours before it
- **THEN** both are eligible, while dates just outside that inclusive interval are excluded

#### Scenario: The provider returns a future publication
- **WHEN** a result has a publication date later than the query time
- **THEN** it is excluded from the new selection

### Requirement: Single-search selection
The system SHALL select at most 20 eligible publications from a single successful search, ordered newest first. It SHALL NOT perform a complementary search to fill the list. Duplicate available original links SHALL identify duplicate publications; publications without links SHALL remain distinct.

#### Scenario: More than ten eligible publications are returned
- **WHEN** the provider returns between 11 and 20 eligible distinct publications
- **THEN** the response includes all of them, rather than limiting the selection to ten

#### Scenario: More than twenty eligible publications are returned
- **WHEN** the provider returns more than 20 eligible distinct publications
- **THEN** the response contains the 20 newest eligible publications

#### Scenario: Fewer than ten publications are available
- **WHEN** the successful search yields fewer than ten eligible publications
- **THEN** the system returns the available selection without performing a complementary search

#### Scenario: Ten to nineteen publications are available
- **WHEN** the successful search yields between ten and 19 eligible distinct publications
- **THEN** the system returns the available selection without performing a complementary search

#### Scenario: Publications share an available link
- **WHEN** eligible results have the same available original link and different dates
- **THEN** the selection contains the publication with the newest date for that link

#### Scenario: Publications have no links
- **WHEN** several eligible results have no link
- **THEN** they are not treated as duplicates merely because their links are empty

### Requirement: Successful empty results
The system SHALL return a successful response with `items: []` when the search succeeds but no publications are eligible, including when `news_results` is absent without an explicit provider error. Empty success SHALL be cached like a nonempty successful selection.

#### Scenario: No eligible publications are found
- **WHEN** the search succeeds and finds no eligible publications
- **THEN** the response is an empty success and subsequent requests reuse it during the cache period

#### Scenario: Results are absent without an error
- **WHEN** the provider returns a valid response without `news_results` or an explicit error
- **THEN** the search succeeds with an empty selection and is not retried

### Requirement: Provider credential confidentiality
The system MUST keep the SerpApi credential on the server and MUST NOT expose it in successful or error responses.

#### Scenario: Responses are returned
- **WHEN** the endpoint returns news or reports an error
- **THEN** the response does not contain the SerpApi API key

### Requirement: News retrieval constraints
The system SHALL retrieve publications from SerpApi Google News in English using the fixed configured query, using only the first story of each grouped result. It SHALL NOT add domain exclusion operators or filter domains locally. Local publication-date eligibility SHALL remain enforced.

#### Scenario: News retrieval is requested
- **WHEN** a refresh or its retry requests publications
- **THEN** the provider receives the unchanged fixed query with `engine=google_news` and English requested, without added domain exclusions

#### Scenario: Publication-date controls remain active
- **WHEN** publications are returned by the provider
- **THEN** local date eligibility is enforced

#### Scenario: Filtering leaves fewer results
- **WHEN** local eligibility or deduplication leaves fewer than 20 results
- **THEN** the response contains only the remaining selection without a complementary search

#### Scenario: Results contain grouped stories
- **WHEN** a result contains a nonempty `stories` array
- **THEN** only its first story is considered as the candidate for that result, using that story's own fields

#### Scenario: The first grouped story is ineligible
- **WHEN** the first story lacks an eligible date or is otherwise excluded
- **THEN** the result contributes no publication and later stories are not substituted

#### Scenario: A grouped result has no stories
- **WHEN** a result has an empty `stories` array
- **THEN** the result contributes no publication

### Requirement: Source-related thumbnail URLs
Each publication SHALL expose its own provider-supplied thumbnail URL, or an empty string when unavailable. Missing or malformed image metadata SHALL NOT exclude an otherwise eligible publication. Images from query-level lists or other publications SHALL NOT be assigned as its thumbnail.

#### Scenario: A publication has source images
- **WHEN** an eligible publication has a nonempty provider-supplied thumbnail URL
- **THEN** its thumbnail is that URL

#### Scenario: A publication has no available image URL
- **WHEN** its thumbnail is missing, empty or malformed
- **THEN** the publication remains in the selection with `thumbnailUrl: ""`

#### Scenario: Only query-level images are available
- **WHEN** query-level images exist but a publication has no source-related thumbnail URL
- **THEN** its `thumbnailUrl` is empty instead of assigning an unrelated image

#### Scenario: Cached thumbnails are returned
- **WHEN** cached news is reused or returned as stale after a failed refresh
- **THEN** each thumbnail remains associated with its original publication and is preserved with the rest of the cached data
