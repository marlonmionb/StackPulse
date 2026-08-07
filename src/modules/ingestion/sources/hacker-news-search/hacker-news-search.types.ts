export type HackerNewsSearchHit = {
  objectID?: string;
  title?: string | null;
  url?: string | null;
  author?: string | null;
  created_at?: string | null;
  created_at_i?: number | null;
  story_text?: string | null;
  points?: number | null;
  num_comments?: number | null;
};

export type HackerNewsSearchResponse = {
  hits: HackerNewsSearchHit[];
};
