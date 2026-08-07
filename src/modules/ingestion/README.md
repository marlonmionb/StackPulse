# Ingestion

Collects external content through a small source contract, normalizes provider-specific data, applies deterministic source-independent URL deduplication, and persists items. The official Hacker News API, HN Search powered by Algolia, and configurable RSS/Atom feeds are implemented. Provider response parsing remains inside each source boundary.

The official Hacker News adapter provides general discovery from current feeds. The separate HN Search adapter provides targeted discovery for configured technical interests, with one date-restricted `story` query per topic. Algolia is consumed only as an external HTTP API; it is not a database or application dependency. Both adapters coexist and emit the same `NormalizedSourceItem` shape.

Immediately after normalization, HTTP(S) links are classified as `ARTICLE`, `VIDEO`, or `UNKNOWN` using source-independent URL rules. YouTube links are stored as `VIDEO`; they are not discarded during ingestion.

The persisted `url` is the original normalized source link. `canonicalUrl` is used for duplicate comparison and removes URL fragments, common tracking parameters, and safe trailing slashes while preserving resource-changing query parameters. Title normalization is intentionally comparison-only; titles are not currently a duplicate key.

HN Search can return the same story for several topics. The existing in-memory canonical URL map collapses those duplicates within a run, and persisted exact/canonical URL checks prevent duplicates across runs and across official Hacker News, HN Search, and RSS. Search-query provenance is not persisted because the current model has no natural metadata field and this iteration does not justify a schema redesign.
