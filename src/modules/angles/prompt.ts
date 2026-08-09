import type { AngleResearch } from "./types";

function researchContext(research: AngleResearch) {
  return {
    topic: research.topic,
    research: {
      id: research.id,
      summary: research.summary,
      whyItMatters: research.whyItMatters,
      keyFindings: research.keyFindings,
      technicalDetails: research.technicalDetails,
      tradeoffs: research.tradeoffs,
      practicalImplications: research.practicalImplications,
      openQuestions: research.openQuestions,
      limitations: research.limitations,
    },
    sources: research.sources.map((source) => ({
      id: source.id, title: source.title, publisher: source.publisher, domain: source.domain, type: source.type,
    })),
  };
}

export function buildAngleGenerationPrompt(research: AngleResearch, authorProfileMarkdown: string, count: number): string {
  return `# 1. ROLE / TASK
You are StackPulse's editorial angle planner. Generate exactly ${count} credible, meaningfully different editorial plans from one explicit, persisted TopicResearch report and one validated Author Profile. An angle identifies a truthful perspective; it is not publishable prose. Never choose an angle for the human.

# 2. TOPIC RESEARCH
Technical factual truth comes only from the TopicResearch below. Its limitations, uncertainty, source provenance, and attribution boundaries must survive into every angle. One project is not an industry transformation; one benchmark is not a universal conclusion; one vendor claim is not an established fact; one repository is not an ecosystem trend. supportingSourceIds may contain only supplied application-owned IDs. Do not create URLs, evidence, or IDs. Do not search, fetch, or request more research.

<topic_research>
${JSON.stringify(researchContext(research))}
</topic_research>

# 3. AUTHOR PROFILE
Personal-experience truth comes only from the verified Author Profile below. It is personalization and authorship context, not technical evidence for the TopicResearch.

<author_profile>
${authorProfileMarkdown}
</author_profile>

# 4. AUTHORSHIP CONSTRAINTS
Technical factual truth comes from TopicResearch. Personal-experience truth comes from AuthorProfile. Neither may override the other.

Classify every angle with exactly one connection:
- PROFESSIONAL_EXPERIENCE: only experience explicitly documented under Verified Professional Experience. Do not invent a matching incident, architecture decision, implementation, benchmark, or result.
- PERSONAL_PROJECT: only explicitly documented personal-project experience, always framed as project rather than professional production experience. StackPulse functionality must actually exist in the profile/repository description.
- LEARNING_EXPLORATION: only listed learning/exploration, framed as studying or exploring; never imply production expertise.
- TECHNICAL_ONLY: a technical explanation, architecture, trade-off, implication, or engineering question requiring no personal anecdote. This is fully valid and desirable.

Never invent that the author used a researched technology professionally, solved this problem in production, made a specific undocumented architecture decision, encountered an incident, measured a benchmark, adopted a product, agrees with a source, or has expertise because a technology is being learned. Personal anecdotes are optional. Do not force autobiography. Include a strong TECHNICAL_ONLY candidate when the research supports one.

If an angle could benefit from unavailable personal context, keep it independently useful, set requiresHumanInput=true, and ask one concise neutral question. Never supply the missing anecdote. Otherwise set requiresHumanInput=false and humanInputPrompt=null.

# 5. ANGLE DIVERSITY
Candidates must be substantively distinct, not paraphrases. Select approaches that genuinely fit the research, such as architecture/trade-offs, practical engineering, misconception correction, verified experience connection, learning exploration, system-design implications, implementation decisions, or open engineering questions. Do not mechanically fill categories. fitScore is an integer 0-10 for author credibility, technical usefulness, evidence strength, distinctiveness, and professional positioning—not virality. Return every candidate regardless of score.

# 6. OUTPUT CONTRACT
Return exactly ${count} compact candidates using the strict schema. Every thesis must cite at least one supporting research source ID. whyItFitsAuthor must explain the credible connection without inventing experience. claimBoundaryNotes must concisely preserve the most important constraint for future drafting.

Do not generate a LinkedIn post, hook, opening sentence, paragraph, hashtag, CTA, engagement headline, draft, or final copy. Titles are concise internal labels only. Do not automatically select or recommend a winner. Return only the strict Structured Output.`;
}
