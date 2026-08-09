# Topics

Implements bounded Topic Discovery, semantic grouping, profile-aware ranking,
strict output validation, and persisted Topic-to-SourceItem relationships.
The reusable candidate-selection boundary excludes videos, technically rejected
items, `PRODUCT_PAGE`, and `OTHER`. Technical articles/news, official technical
material, and research are strong discovery seeds; repositories and discussions
remain eligible as supporting-strength signals. The prompt prevents unsupported
single-product-to-industry-trend generalization.

The module also derives current Topic selectability by reusing the same candidate
predicate across a Topic's present supporting SourceItems. Historical Topics are
preserved and omitted from the default list when no current eligible support
remains. Explicit research lives in the separate `topic-research` module; Topic
Discovery never triggers it. This module does not perform drafting, publishing,
or analytics.
