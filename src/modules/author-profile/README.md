# Author Profile Context

This deterministic module loads the manually maintained, version-controlled
`docs/author-profile.md` file as prompt-ready Markdown. It supplies verified
professional and personal-project experience, learning context, positioning,
content goals, and explicit claim boundaries for future editorial AI stages.

`loadAuthorProfile()` reads UTF-8 text, trims whitespace at the file boundaries,
enforces the centralized 12,000-character maximum, and requires the six
conceptual sections listed in `validation.ts`. It returns the Markdown without
parsing technologies into application entities. The optional path argument is
intended for tests and other explicit repository-controlled uses.

Validate the repository profile without making an AI call:

```bash
npm run author-profile:validate
```

## Editorial boundary

```text
TopicResearch factual evidence + AuthorProfile verified author context
                              -> future Angle Generation
                              -> human angle selection
                              -> future Draft Generation
```

Future Angle Generation must distinguish strong professional connections,
personal-project connections, learning/exploration connections, and topics with
no verified personal connection. No connection is a valid outcome: the model
should suggest a useful technical approach instead of inventing an anecdote.
Draft Generation must occur only after a human selects an angle.

The profile is editorial/personalization context only. It does not affect
Technical Relevance, Content Kind, Topic Discovery, Topic Ranking, or Topic
Research factual synthesis. It is not persisted in Prisma, edited through a UI,
or validated by AI.
