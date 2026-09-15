import { lookup } from 'node:dns';
import { Agent, request, type Dispatcher } from 'undici';
import type { Readable } from 'node:stream';
import ipaddr from 'ipaddr.js';

export function isPublicAddress(address: string): boolean {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === 'unicast';
  } catch {
    return false;
  }
}
export function checkedUrl(value: string): URL {
  const url = new URL(value);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port))
  )
    throw new Error('不支持的来源地址');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    (ipaddr.isValid(host) && !isPublicAddress(host))
  )
    throw new Error('来源地址不可访问');
  return url;
}
// Resolve and validate at connection time, avoiding a DNS check/use race.
const dispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      lookup(hostname, { all: true }, (error, addresses) => {
        if (error) return callback(error, '', 4);
        const fakeDns = process.env.HANA_FAKE_IP_DNS === '1';
        const fake = addresses.filter((a) => /^198\.(18|19)\./.test(a.address));
        const usable = fakeDns && fake.length ? fake : addresses;
        if (
          !usable.length ||
          ((!fakeDns || !fake.length) && usable.some((a) => !isPublicAddress(a.address)))
        )
          return callback(new Error('来源解析到非公网地址'), '', 4);
        if (options.all) callback(null, usable);
        else callback(null, usable[0]!.address, usable[0]!.family);
      });
    },
  },
});
export interface SourceHost {
  text(url: string, signal?: AbortSignal, headers?: Record<string, string>): Promise<string>;
  json(url: string, signal?: AbortSignal, headers?: Record<string, string>): Promise<unknown>;
  post?(
    url: string,
    body: unknown,
    signal?: AbortSignal,
    headers?: Record<string, string>,
  ): Promise<unknown>;
}
export interface UpstreamResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: Readable;
  url: string;
}
export async function upstream(
  value: string,
  signal?: AbortSignal,
  headers: Record<string, string> = {},
  body?: string,
  transport: Dispatcher = dispatcher,
): Promise<UpstreamResponse> {
  let url = checkedUrl(value);
  let outgoing = { ...headers };
  let requestBody = body;
  for (let hop = 0; hop < 5; hop++) {
    const response = await request(url, {
      dispatcher: transport,
      signal,
      headers: outgoing,
      method: requestBody === undefined ? 'GET' : 'POST',
      body: requestBody,
      headersTimeout: 15_000,
      bodyTimeout: 20_000,
    });
    // BodyReadable emits an AbortError when deliberately destroyed. Keep it handled
    // even when rejecting a response before a consumer has attached.
    response.body.on('error', () => {});
    if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
      response.body.destroy();
      const location = response.headers.location;
      if (typeof location !== 'string') throw new Error('来源重定向异常');
      const next = checkedUrl(new URL(location, url).href);
      if (next.origin !== url.origin) {
        outgoing = Object.fromEntries(
          Object.entries(outgoing).filter(
            ([key]) => !['cookie', 'authorization', 'apikey'].includes(key.toLowerCase()),
          ),
        );
      }
      if (response.statusCode === 303) requestBody = undefined;
      url = next;
      continue;
    }
    return { ...response, url: url.href };
  }
  throw new Error('来源重定向次数过多');
}
export async function boundedText(
  body: AsyncIterable<Uint8Array>,
  max = 4 * 1024 * 1024,
): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of body) {
    size += chunk.length;
    if (size > max) throw new Error('来源响应过大');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
export const sourceHost: SourceHost = {
  async post(url, body, signal, headers) {
    const response = await upstream(
      url,
      AbortSignal.any([AbortSignal.timeout(18_000), ...(signal ? [signal] : [])]),
      { ...headers, 'Content-Type': 'application/json' },
      JSON.stringify(body),
    );
    if (response.statusCode !== 200) {
      response.body.destroy();
      throw new Error(`来源暂时不可用（${response.statusCode}）`);
    }
    try {
      return JSON.parse(await boundedText(response.body)) as unknown;
    } catch {
      throw new Error('来源返回了异常数据');
    }
  },
  async text(url, signal, headers) {
    const response = await upstream(
      url,
      AbortSignal.any([AbortSignal.timeout(18_000), ...(signal ? [signal] : [])]),
      headers,
    );
    if (response.statusCode !== 200) {
      response.body.destroy();
      throw new Error(`来源暂时不可用（${response.statusCode}）`);
    }
    return boundedText(response.body);
  },
  async json(url, signal, headers) {
    const text = await this.text(url, signal, headers);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error('来源返回了验证页面或异常数据，请切换来源');
    }
  },
};

export async function closeNetwork() {
  await dispatcher.destroy();
}
