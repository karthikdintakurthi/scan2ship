export class McpAuthError extends Error {
  constructor(
    public readonly code: 'invalid_token' | 'insufficient_scope' | 'disabled' | 'tenant_not_allowed',
    message: string,
    public readonly status = 401
  ) {
    super(message);
    this.name = 'McpAuthError';
  }
}

export class McpToolError extends Error {
  constructor(
    public readonly code:
      | 'invalid_params'
      | 'not_found'
      | 'forbidden'
      | 'rate_limited'
      | 'internal',
    message: string,
    public readonly retryable = false
  ) {
    super(message);
    this.name = 'McpToolError';
  }
}
