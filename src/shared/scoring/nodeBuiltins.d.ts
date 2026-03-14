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
}

declare module 'node:path' {
  export function resolve(...segments: string[]): string;
}

declare module 'node:fs/promises' {
  export function readFile(path: string, encoding: string): Promise<string>;
  export function readdir(path: string): Promise<string[]>;
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
  env: NodeJS.ProcessEnv;
  exit(code?: number): never;
  on(signal: string, handler: () => void | Promise<void>): void;
};

declare function fetch(input: string): Promise<{ status: number; json(): Promise<unknown> }>;
