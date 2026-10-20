# Shared Edge code

- QRC AI uses one streamed item per invocation, durable bounded per-attempt continuation and append-only retry receipts; only finished transient upstream errors retry, unknown/active work requires review; why: prevent timeout chains, concurrent billing and overwriting definitive corrections.

- Registration upload validates authenticated owner/admin or scoped onboarding HMAC, immutable UUID/content hash and explicit acknowledgement; why: retries never duplicate or replace prior versions.

- Theory-fail mail + practice choice (VTC/TAXI/TA by filiereDepuisDossier; continue/PA/RP/unknown blocked): template in `supabase/functions/_shared/modeleEchecChoixPratique.ts` (re-exported to src); prepare/send only via Edge `envoi-echec-choix-pratique` (admin, eligibility re-read in DB, unique per learner+exam date+version, atomic claim, unknown outcome = `indetermine`, never auto-resent); signing via `document-signature-public` using frozen identity/text/mail snapshot and server PNG validation; immutable trigger; why: no duplicate mail, proofs never follow later file edits.
