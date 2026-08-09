# Topics

Implements bounded Topic Discovery, semantic grouping, profile-aware ranking,
strict output validation, and persisted Topic-to-SourceItem relationships.
The reusable candidate-selection boundary excludes videos, technically rejected
items, `PRODUCT_PAGE`, and `OTHER`. Technical articles/news, official technical
material, and research are strong discovery seeds; repositories and discussions
remain eligible as supporting-strength signals. The prompt prevents unsupported
single-product-to-industry-trend generalization.

This module does not perform Topic Research, drafting, publishing, or analytics.
