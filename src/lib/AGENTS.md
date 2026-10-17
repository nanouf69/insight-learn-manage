# Persistence boundaries
- Technical RPCs use freshSessionCall with same-account checks; module pages use an account-scoped durable queue and server readback; why: no anonymous calls or false confirmations.
- Upload client shares documentUploadRules and stable operation IDs across retries; why: limits and acknowledgements must match the server.
- Trailing-dot correction opens a new tab manually without transferring auth/storage; why: separate browser origins must retain their own queues.