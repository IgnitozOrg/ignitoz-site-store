# Proposal

## Why

Ignitoz visitors need a simple way to discover articles about companies adopting OpenSpec and reach their original sources. They also need to understand how current the information is and retain access to available news when search is temporarily unavailable.

## What Changes

- Provide a public, shared selection of recent OpenSpec adoption articles, with summaries, publication dates, original links and source-related thumbnails when available.
- Refine discovery toward company adoption experiences and news, excluding unwanted sources and avoiding searches performed only to fill the list.
- Reuse available results and clearly indicate freshness, preserving earlier information during temporary failures.
- Limit excessive use while allowing access from the confirmed Ignitoz website origins.
- Provide consistent public errors that protect credentials and internal details.
- Verify the behavior through automated unit and local integration tests.

## Capabilities

### New Capabilities

- `openspec-adoption-news`: Public discovery of company adoption articles, including publication metadata, optional thumbnails, freshness, availability and access behavior.

### Modified Capabilities

None.

## Out of Scope

- Frontend cards and image processing or hosting.
- Visitor-defined searches and independent verification of adoption claims.
- Persistent or shared storage between service instances, scheduled updates and a global search-spending cap.
- Tests against deployed services, deployment-trigger automation, live client-IP/rate-limit verification and stress tests.

## Impact

The backend news service, its public response contract, search integration, documentation and automated tests are affected. Public error consistency also applies across the API. Website consumers gain optional thumbnail information; frontend presentation remains a separate effort. Search relevance and language coverage remain dependent on the source provider.
