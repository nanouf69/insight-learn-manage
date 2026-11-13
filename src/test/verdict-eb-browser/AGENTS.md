# Verdict EB browser harness
- Test-only harness rendering the real learner exam cards; Playwright stubs every backend call with read-only fixtures, because verdict checks must never write learner data or touch production sessions.
- Missing revision answers route back to real inputs even when old checked markers exist; completion never unlocks editing while in flight and resumed writes prime the sequence from the displayed server row; why: avoid misleading network errors and stale-version retries without rewriting original copies.
