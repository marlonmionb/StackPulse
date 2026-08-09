# Angle Generation and Human Selection

This module combines one exact persisted `TopicResearch` report, its
`TopicResearchSource` evidence, and the validated Author Profile to produce a
bounded set of editorial plans. It does not perform Web Search, fetch source
content, mutate research, generate post prose, or choose a candidate.

```text
TopicResearch factual evidence + AuthorProfile verified personal context
                              -> ContentAngle candidates
                              -> explicit human selection
                              -> future Draft Generation (not implemented)
```

Generation requires `--research-id`, uses `gpt-5.6-terra` with medium reasoning
and strict Structured Outputs, and persists all candidates atomically. Every
candidate stores the exact research relation, a shared application-generated
`generationId`, the model, and a SHA-256 hash of the validated profile content.
The Markdown profile itself remains version-controlled and is not copied into
Prisma.

Supporting evidence is relational: `ContentAngleSource` points to the existing
`TopicResearchSource` row. The model sees and returns its stable `evidenceId`
(`s1`, `s2`, and so on); runtime validation rejects unknown or duplicate IDs.

Normal generation skips an already-generated research report without an AI
call. `--force` appends a new generation and preserves history. Selection makes
exactly one angle `SELECTED` for a research report by resetting any prior
selection to `GENERATED` in the same transaction. It never calls AI.

```bash
npm run angles:generate -- --research-id=<TOPIC_RESEARCH_ID>
npm run angles:generate -- --research-id=<TOPIC_RESEARCH_ID> --force
npm run angles:list -- --research-id=<TOPIC_RESEARCH_ID>
npm run angles:select -- --angle-id=<ANGLE_ID>
```

Future Draft Generation must require the selected `ContentAngle`, the exact
`TopicResearch` it references, a currently validated Author Profile, claim
boundary notes, and any optional human context collected by a future feature.
It must not choose another angle independently.
