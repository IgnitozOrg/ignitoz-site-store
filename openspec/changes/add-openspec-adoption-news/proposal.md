# Proposal

## Why

Ignitoz visitors need a reliable way to discover publications about organizations adopting Fission-AI's OpenSpec. The current backend does not provide news data, and the search provider's credentials must remain on the server.

## What Changes

- Provide a public, on-demand backend endpoint returning a shared selection of up to ten dated publications, with titles, excerpts, original links, and publication dates.
- Search for Spanish and English content, prioritize the last 30 days, and supplement with older publications when needed; return fewer or no results when appropriate.
- Reuse results for 24 hours per instance, share concurrent refreshes, and return the last successful result with freshness metadata if the provider fails. Report an error when no previous result exists.
- Protect the endpoint with configurable per-IP rate limiting and allow browser access from the two Ignitoz production origins. Keep the fixed search configuration and provider credential on the server.
- Cover observable HTTP behavior with deterministic provider simulations; validate provider date, language, and period capabilities during implementation.
- Exclude frontend cards, user-defined searches, independent verification of adoption, persistent or cross-instance storage, scheduled refreshes, and a global provider spending cap.

## Capabilities

### New Capabilities

- `openspec-adoption-news`: Public retrieval and selection of OpenSpec adoption news, including result freshness, availability, and access controls.

### Modified Capabilities

None.

## Impact

The NestJS backend gains a public API, a Tavily Search integration and server-side configuration. Deployment must supply the provider credential and choose the IP limit and window; the Ignitoz production origins need browser access. Automated HTTP tests will simulate Tavily, while a separate exploratory check requires a configured credential.
