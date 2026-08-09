import type { ContentKindCandidate } from "./types";

function hostnameOf(url: string): string | undefined {
  try { return new URL(url).hostname; } catch { return undefined; }
}

export function buildContentKindPrompt(items: ContentKindCandidate[]): string {
  const input = items.map((item) => ({
    sourceItemId: item.id,
    title: item.title,
    summary: item.summary ?? undefined,
    url: item.url,
    hostname: hostnameOf(item.url),
    source: item.source,
    technicalCategory: item.technicalCategory ?? undefined,
  }));

  return `Classify the EDITORIAL OR SOURCE NATURE of every supplied technical SourceItem.

This is ContentKind, not physical ContentType and not Technical Relevance. Every item already passed a broad software/computing relevance gate. Classify the page's primary editorial purpose from the supplied lightweight metadata.

Taxonomy:
- TECHNICAL_ARTICLE: substantive explanatory, tutorial, analytical, or engineering content; authored technical articles and primarily explanatory engineering blog posts.
- TECHNICAL_NEWS: informational reporting about a release, event, ecosystem change, acquisition, platform change, or security event; not mere marketing.
- OFFICIAL_TECHNICAL: official documentation, release notes, changelogs, RFC-like material, or an official engineering announcement with technical substance.
- RESEARCH: academic papers, preprints, or substantial formal technical research.
- REPOSITORY: source-code repositories or repository release/project pages primarily representing repository material.
- PRODUCT_PAGE: SaaS landing, promotional product, signup/conversion, pricing, product overview, or "try our tool" page whose primary goal is promotion or sale.
- DISCUSSION: forum, Q&A, Hacker News, or community conversation when the represented page is the discussion itself.
- OTHER: a valid page that fits none of the useful categories.

Important rules:
- A technology-related page is not automatically an article.
- A page on a technology-company domain is not automatically PRODUCT_PAGE. Judge the specific page's editorial purpose.
- Distinguish a product marketing page from a substantive engineering article about how that product was built.
- The ingestion source describes how StackPulse found the item, not the represented page. An external product URL discovered through Hacker News is not DISCUSSION merely because its title begins "Show HN"; use DISCUSSION only when the represented URL/page is itself the thread, forum, Q&A, or conversation.
- Use only supplied metadata; do not assume article-body details or fetch anything.

Examples:
- "Introducing FooAgent — autonomous coding for your entire team" with a SaaS homepage or signup-oriented description -> PRODUCT_PAGE.
- "How we built long-running coding agents at Foo" with architecture and implementation trade-offs -> TECHNICAL_ARTICLE, or OFFICIAL_TECHNICAL if it is primarily an official technical announcement.
- "React 20 release notes" -> OFFICIAL_TECHNICAL.
- "React 20 released with compiler improvements" from a technical publication -> TECHNICAL_NEWS.
- "An analysis of React Compiler internals" -> TECHNICAL_ARTICLE.
- An arXiv paper describing a distributed-systems technique -> RESEARCH.
- A GitHub repository for a database engine -> REPOSITORY.
- A Hacker News discussion URL about database durability, where the represented page is the discussion itself -> DISCUSSION.
- A "Show HN" item linking to an external SaaS homepage or signup page -> PRODUCT_PAGE, not DISCUSSION.

Treat each sourceItemId as an opaque identifier. The required output object is keyed by every exact supplied ID; fill every required key once and do not shorten, normalize, or reconstruct keys. Confidence must be HIGH, MEDIUM, or LOW. Keep reason to one short sentence of at most 180 characters.

Items:
${JSON.stringify(input)}`;
}
