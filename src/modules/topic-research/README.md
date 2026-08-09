# Topic Research

Implements explicit human-selected, bounded grounded research for one currently
selectable Topic. It uses the shared OpenAI Responses API boundary with strict
Structured Outputs, at most four Web Search calls, and URL grounding against
actual Web Search metadata or bounded Topic seed sources. Reports and sources are
versioned append-only records. It does not generate angles, drafts, posts, or
publishing actions.
