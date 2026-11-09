# Global QRC isolated prototype
- Candidate SQL and transport are test-only and must never be imported by active application code or placed in migration history, because only disposable preparation is authorized.
- All database writes use a newly created loopback-only PostgreSQL cluster with inherited PG variables removed, because the real project database is shared with production.
- Historical corrections append separate events; source results, answers and native QRC stay immutable, because preparation must never rewrite learner evidence.