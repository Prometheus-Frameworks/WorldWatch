declare module 'node:assert/strict' {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
  };
  export default assert;
}

declare module 'node:test' {
  export default function test(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:http' {
  export interface IncomingMessage {
    method?: string;
    url?: string;
  }

  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string | number): void;
    end(body?: string): void;
  }

  export interface AddressInfo {
    port: number;
  }

  export interface Server {
    listen(port: number, cb?: () => void): void;
    close(cb?: (err?: Error) => void): void;
    address(): AddressInfo | null;
  }

  export function createServer(
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
  ): Server;
}

declare module 'node:url' {
  export class URL {
    constructor(input: string, base?: string);
    pathname: string;
    searchParams: {
      get(name: string): string | null;
    };
  }

  export function pathToFileURL(path: string): { href: string };
}

declare module 'node:path' {
  export function resolve(...segments: string[]): string;
  export function join(...segments: string[]): string;
}

declare module 'node:os' {
  export function tmpdir(): string;
}

declare module 'node:fs/promises' {
  export function readFile(path: string, encoding: string): Promise<string>;
  export function readdir(path: string): Promise<string[]>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function writeFile(path: string, data: string): Promise<void>;
}

declare const Buffer: {
  byteLength(input: string): number;
};

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare const process: {
  cwd(): string;
  argv: string[];
  env: NodeJS.ProcessEnv;
  exit(code?: number): never;
  on(signal: string, handler: () => void | Promise<void>): void;
};

declare function fetch(input: string): Promise<{ status: number; json(): Promise<unknown> }>;
declare function setImmediate(callback: () => void): void;
