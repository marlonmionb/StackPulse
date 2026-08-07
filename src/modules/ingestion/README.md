# Ingestion

Collects external content through a small source contract, normalizes provider-specific data, applies deterministic source-independent URL deduplication, and persists items. Hacker News and configurable RSS/Atom feeds are implemented. Feed XML parsing remains inside the RSS source boundary.

The persisted `url` is the original normalized source link. `canonicalUrl` is used for duplicate comparison and removes URL fragments, common tracking parameters, and safe trailing slashes while preserving resource-changing query parameters. Title normalization is intentionally comparison-only; titles are not currently a duplicate key.
