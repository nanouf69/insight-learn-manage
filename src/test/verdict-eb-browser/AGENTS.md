# Verdict EB browser harness
- Test-only harness rendering the real learner exam cards; Playwright stubs every backend call with read-only fixtures, because verdict checks must never write learner data or touch production sessions.
