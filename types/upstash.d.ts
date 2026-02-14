declare module '@upstash/ratelimit' {
  export class Ratelimit {
    constructor(options: {
      redis: any;
      limiter: any;
      analytics?: boolean;
      prefix?: string;
    });
    limit(
      identifier: string,
      options?: { rate?: number; duration?: string }
    ): Promise<{ success: boolean; remaining: number; reset: number }>;
    static slidingWindow(tokens: number, window: string): any;
    static fixedWindow(tokens: number, window: string): any;
    static tokenBucket(tokens: number, interval: string, maxTokens: number): any;
  }
}

declare module '@upstash/redis' {
  export class Redis {
    constructor(options: { url: string; token: string });
  }
}
