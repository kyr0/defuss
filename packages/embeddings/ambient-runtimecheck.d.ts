declare module '@huggingface/transformers' {
  export const env: Record<string, unknown>;
  export function pipeline(
    task: 'feature-extraction',
    model: string,
    options?: Record<string, unknown>,
  ): Promise<(input: string | string[], options?: Record<string, unknown>) => Promise<{ data: Float32Array; dims: number[] }>>;
}
