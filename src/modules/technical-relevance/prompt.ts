import type { TechnicalRelevanceCandidate } from "./types";

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

export function buildTechnicalRelevancePrompt(
  items: TechnicalRelevanceCandidate[],
): string {
  const input = items.map((item) => ({
    id: item.id,
    title: item.title,
    source: item.source,
    hostname: hostnameOf(item.url),
    summary: item.summary ?? undefined,
    publishedAt: item.publishedAt?.toISOString(),
  }));

  return `Classify BROAD TECHNICAL RELEVANCE TO SOFTWARE ENGINEERING for every supplied item.

This is a coarse eligibility gate, not a content-ranking stage.

Consider an item relevant if it is meaningfully about software engineering or closely related computing technology, including software development, programming languages, frontend/backend/full-stack engineering, developer tooling, APIs and software platforms, databases, distributed systems, software architecture, cloud infrastructure, DevOps and observability, cybersecurity, AI/ML systems and engineering, AI training and inference infrastructure, or computing infrastructure and hardware that directly affects software systems.

Do not evaluate whether the topic matches the author's stack, would make a good LinkedIn post, is popular or engaging, or deserves high content priority. Those decisions happen later.

Favor recall over precision. If an item is genuinely related to computing or software engineering but somewhat peripheral, prefer allowing it through with a moderate score rather than rejecting it.

Reject items primarily about politics, general economics, medicine or biology, general science, culture, unrelated business news, social issues, or non-computing engineering. A technology company name alone is not evidence of technical relevance.

Resolve ambiguous terms semantically: React.js vs biological reaction/reactivation; Java programming language vs Java island or coffee; Spring Boot vs the season or natural springs; Apache Kafka vs Franz Kafka.

Examples:
- "React Compiler improvements" -> relevant, FRONTEND, score 8-10.
- "Building event-driven systems with Apache Kafka" -> relevant, BACKEND or ARCHITECTURE, score 8-10.
- "AMD improves hardware for AI inference" -> relevant, AI or OTHER_TECH, score 6-8.
- "99% of My Website Traffic Is Bots" -> relevant if metadata indicates web infrastructure, automation, bot traffic, security, crawling, or traffic engineering; use a moderate score when evidence is limited.
- "Meta ordered to pay damages over children's mental health" -> not relevant, NON_SOFTWARE, score 0-2.
- "Virus reactivation in acute and long Covid-19" -> not relevant, NON_SOFTWARE, score 0-2.
- "Origins of Life on Earth by Tracing Early Chemical Reactions" -> not relevant, NON_SOFTWARE, score 0-2.

Score 0-2 for clearly unrelated content, 3-5 for ambiguous or weakly connected content, 6-7 for genuinely relevant but adjacent or peripheral content, and 8-10 for clearly and directly relevant software engineering content.

Consistency rules: if relevant is false, category MUST be NON_SOFTWARE; if relevant is true, category MUST NOT be NON_SOFTWARE.

Do not infer facts absent from the supplied metadata. Keep each reason to one short sentence. Return exactly one result for every input id using the required schema.

Items:
${JSON.stringify(input)}`;
}
