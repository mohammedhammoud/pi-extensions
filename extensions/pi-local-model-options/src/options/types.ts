export interface ModelOptions {
  enabled: boolean;
  temperature?: number;
  top_p?: number;
  num_ctx?: number;
}

export interface Store {
  version: 1;
  models: Record<string, ModelOptions>;
}

export type OptionId =
  | "enabled"
  | "temperature"
  | "top_p"
  | "num_ctx"
  | "preset"
  | "reset";
