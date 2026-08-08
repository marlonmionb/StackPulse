import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { MetadataEnrichmentConfig } from "./config";

const USER_AGENT = "StackPulse/0.1 metadata-enrichment (+https://github.com/stackpulse)";
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type MetadataFetchResult =
  | { kind: "HTML"; html: string }
  | { kind: "NO_METADATA" };

export type ResolveHostname = (hostname: string) => Promise<string[]>;

export type MetadataFetcherDependencies = {
  fetchImpl?: typeof fetch;
  resolveHostname?: ResolveHostname;
};

export class MetadataFetchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MetadataFetchError";
  }
}

function normalizedHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

export function isPrivateAddress(address: string): boolean {
  const normalized = normalizedHostname(address);
  const version = isIP(normalized);

  if (version === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (version === 6) {
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/u.test(normalized) ||
      normalized.startsWith("::ffff:") && isPrivateAddress(normalized.slice(7))
    );
  }
  return false;
}

function isObviouslyLocalHostname(hostname: string): boolean {
  const normalized = normalizedHostname(hostname);
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    isPrivateAddress(normalized)
  );
}

async function defaultResolveHostname(hostname: string): Promise<string[]> {
  if (isIP(normalizedHostname(hostname))) return [normalizedHostname(hostname)];
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return addresses.map((entry) => entry.address);
}

export async function assertSafePublicHttpUrl(
  value: string,
  resolveHostname: ResolveHostname = defaultResolveHostname,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new MetadataFetchError("Metadata URL is malformed.", { cause: error });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new MetadataFetchError("Metadata URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password) {
    throw new MetadataFetchError("Metadata URL must not contain credentials.");
  }
  if (isObviouslyLocalHostname(url.hostname)) {
    throw new MetadataFetchError("Metadata URL targets a local or private host.");
  }

  let addresses: string[];
  try {
    addresses = await resolveHostname(normalizedHostname(url.hostname));
  } catch (error) {
    throw new MetadataFetchError("Metadata hostname could not be resolved.", { cause: error });
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new MetadataFetchError("Metadata hostname resolves to a local or private address.");
  }
  return url;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new MetadataFetchError(`Metadata response exceeds ${maxBytes} bytes.`);
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new MetadataFetchError(`Metadata response exceeds ${maxBytes} bytes.`);
    }
    parts.push(decoder.decode(value, { stream: true }));
  }
  parts.push(decoder.decode());
  return parts.join("");
}

function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) return true;
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  return mediaType === "text/html" || mediaType === "application/xhtml+xml";
}

export async function fetchMetadataHtml(
  value: string,
  config: Pick<MetadataEnrichmentConfig, "timeoutMs" | "maxBytes">,
  dependencies: MetadataFetcherDependencies = {},
): Promise<MetadataFetchResult> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const resolveHostname = dependencies.resolveHostname ?? defaultResolveHostname;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    let url = await assertSafePublicHttpUrl(value, resolveHostname);

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      let response: Response;
      try {
        response = await fetchImpl(url, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Accept: "text/html,application/xhtml+xml;q=0.9",
            "User-Agent": USER_AGENT,
          },
        });
      } catch (error) {
        throw new MetadataFetchError("Metadata request failed.", { cause: error });
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new MetadataFetchError("Metadata redirect has no location.");
        if (redirectCount === MAX_REDIRECTS) {
          throw new MetadataFetchError("Metadata request exceeded the redirect limit.");
        }
        url = await assertSafePublicHttpUrl(new URL(location, url).href, resolveHostname);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new MetadataFetchError(`Metadata request returned HTTP ${response.status}.`);
      }
      if (!isHtmlContentType(response.headers.get("content-type"))) {
        await response.body?.cancel();
        return { kind: "NO_METADATA" };
      }
      return { kind: "HTML", html: await readBoundedBody(response, config.maxBytes) };
    }
    throw new MetadataFetchError("Metadata request exceeded the redirect limit.");
  } finally {
    clearTimeout(timeout);
  }
}
