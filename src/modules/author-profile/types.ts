export type AuthorProfileContext = {
  content: string;
  sourcePath: string;
  characterCount: number;
};

export type AuthorProfileValidationResult = AuthorProfileContext & {
  requiredSections: number;
  totalRequiredSections: number;
};
