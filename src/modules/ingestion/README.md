# Ingestion

Collects external content through a small source contract, normalizes provider-specific data, applies deterministic source-independent URL deduplication, and persists items. Hacker News and configurable RSS/Atom feeds are implemented. Feed XML parsing remains inside the RSS source boundary.

Immediately after normalization, HTTP(S) links are classified as `ARTICLE`, `VIDEO`, or `UNKNOWN` using source-independent URL rules. YouTube links are stored as `VIDEO`; they are not discarded during ingestion.

The persisted `url` is the original normalized source link. `canonicalUrl` is used for duplicate comparison and removes URL fragments, common tracking parameters, and safe trailing slashes while preserving resource-changing query parameters. Title normalization is intentionally comparison-only; titles are not currently a duplicate key.
