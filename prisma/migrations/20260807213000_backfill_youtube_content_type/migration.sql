-- Backfill videos stored before deterministic content-type detection existed.
UPDATE "SourceItem"
SET "contentType" = 'VIDEO'
WHERE "contentType" = 'UNKNOWN'
  AND (
    lower("url") GLOB 'http://youtube.com/*'
    OR lower("url") GLOB 'https://youtube.com/*'
    OR lower("url") GLOB 'http://*.youtube.com/*'
    OR lower("url") GLOB 'https://*.youtube.com/*'
    OR lower("url") GLOB 'http://youtu.be/*'
    OR lower("url") GLOB 'https://youtu.be/*'
  );
