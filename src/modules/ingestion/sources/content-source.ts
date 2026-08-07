export interface ContentSource<T> {
  fetch(): Promise<T[]>;
}
