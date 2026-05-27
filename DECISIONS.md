# SupaTicket — Decision Log

This file records architectural and product decisions that are intentionally 
deferred, partially implemented, or dependent on business input.

Read this before building any feature that touches ticket lifecycle, 
role permissions, or app_config.

---

## DEC-001 — Resolved Ticket Re-open Policy

**Status:** Deferred — pending business confirmation  
**Date logged:** 2026-05-26  
**Logged by:** Chella Kamina  

**The question:**  
Should agents be able to re-open a Resolved or Closed ticket by changing 
its status back to Open? Or does re-opening require admin involvement?

**Context:**  
The service layer guard on updateTicket currently blocks all edits on 
terminal tickets (Resolved, Closed) including status changes.  
SupaMoto call centre agents may need to re-open tickets when customers  
call back about an unresolved issue.

**When Postgres replaces Supabase (Phase 8+):**  
This rule should move to an app_config flag — allow_ticket_reopen (boolean).  
The guard in updateTicket reads the flag before throwing.  
Admins toggle it in the admin console without a code change or deployment.

**Action required:**  
Confirm with Annie / call centre team: can agents re-open tickets,  
or is that an admin action only? Answer determines the flag default.

---

## DEC-002 — Email Confirmation Disabled (Dev Environment)

**Status:** Intentional — dev environment only  
**Date logged:** 2026-05-27  
**Logged by:** Chella Kamina  

**The decision:**  
Supabase email confirmation is deliberately disabled on this project.

**Why:**  
This is a dev/test environment. Requiring email confirmation slows 
down testing for the team. New accounts need to work immediately 
without an inbox dependency.

**When self-hosted PostgreSQL replaces Supabase (Phase 8+):**  
Auth moves to a dedicated auth layer (to be decided). Email 
confirmation policy will be defined then based on the production 
auth

---

## DEC-003 — system_logs Retention Policy

**Status:** Implemented — review before Phase 8  
**Date logged:** 2026-05-27  
**Logged by:** Chella Kamina  

**The decision:**  
system_logs rows older than 90 days are deleted nightly at 02:00 UTC  
via prune_old_system_logs() scheduled with pg_cron.  

**When Postgres replaces Supabase (Phase 8+):**  
Replace cron.schedule() with your job scheduler (pg_cron on self-hosted,  
or a cron job at the OS level). The prune_old_system_logs() function  
is standard SQL and requires no changes.
