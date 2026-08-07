import {
  ContentType,
  type ContentType as ContentTypeValue,
} from "../ingestion/content-type";

type TopicCandidate = {
  contentType: ContentTypeValue;
};

export function isEligibleForTopicDiscovery(item: TopicCandidate): boolean {
  return item.contentType !== ContentType.VIDEO;
}
