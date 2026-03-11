export interface Config {
  content?: string | string[] | { raw: string; extension: string }[];
  theme?: {
    extend?: Record<string, unknown>;
    [key: string]: unknown;
  };
  plugins?: unknown[];
  [key: string]: unknown;
}
