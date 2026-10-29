# Persistence boundaries
- Dashboard pending EDOF practice uses the shared signature classifier and latest EDOF badge query, display-only; why: signed practical dates disappear on confirmed E marking without deleting proofs or counting theory.
- Attendance windows are server-owned; consumers use `emargementFenetres` for due slots, actual hours and next-opening delay; why: theory, practice and manual signatures must share exactly the same authorization.
- Technical RPCs use freshSessionCall with same-account checks; module pages use an account-scoped durable queue and server readback; why: no anonymous calls or false confirmations.
- Upload client shares documentUploadRules and stable operation IDs across retries; why: limits and acknowledgements must match the server.
- Trailing-dot correction opens a new tab manually without transferring auth/storage; why: separate browser origins must retain their own queues.
- Autosave pending drafts have a separate account/dossier-scoped journal from confirmed caches; why: an older in-flight acknowledgement cannot erase newer local edits.