## Overview

Split the single `admin` role into a multi-stage workflow with 5 admin sub-roles. Each application moves through stages: **Moderator → Service Delivery → Technical → Billing → Completed**, with the ability to bounce back down with a required comment. Each role only sees applications currently at their stage. A **Main Admin** retains full visibility/control over everything.

## 1. Roles & Data Model Changes

### New roles (added to `app_role` enum)
- `main_admin` — full access (everything current admins do today)
- `moderator` — credit-vet new applications, decide pass-up or reject
- `service_delivery` — review approved apps, attach an advisory note, pass-up or send back
- `technical` — provision assets (SIMs, ports, equipment), pass-up or send back
- `billing` — verify payment, attach receipt info, complete or send back
- Existing: `customer`, `technician` (field tech, kept as-is)

### Migration of existing data
- Every user currently holding `admin` role gets `main_admin` added.
- Old `admin` role kept temporarily for backward-compatible RLS (we update policies to also accept `main_admin`).

### New columns on `applications`
- `stage` (text) — one of: `moderation`, `service_delivery`, `technical`, `billing`, `completed`, `rejected`
- `current_assignee_role` (text) — mirrors `stage` for fast filtering
- `rejection_reason` (text, nullable) — last rejection comment
- Stage transitions logged in existing `application_status_history` (extended with `stage_from`, `stage_to`, `comment`, `direction` = `up` | `down`).

### New table: `application_stage_actions`
Tracks every approval / rejection / advisory note with: `application_id`, `actor_id`, `actor_role`, `from_stage`, `to_stage`, `action` (`approve` | `reject` | `note`), `comment`, `created_at`. Comment is **required** when action = `reject`.

### RLS rules (per role)
- `main_admin` → full SELECT/UPDATE on everything (same as today's admin).
- `moderator` → SELECT applications where `stage = 'moderation'` OR they previously acted on it; UPDATE only stage=moderation.
- `service_delivery` → SELECT where `stage = 'service_delivery'` OR previously acted; UPDATE only that stage.
- `technical` → same pattern, stage=technical.
- `billing` → same pattern, stage=billing.
- All sub-roles can INSERT into `application_stage_actions` for their own stage.
- Customer-facing `Track` page keeps showing public history but **never the internal advisory comments** (we add a `is_internal` flag on actions; only stage transitions show externally).

## 2. Signup Flow

- Public signup stays customer-only.
- New **`/admin-signup`** page (already partially exists) extended:
  - Invite code unlocks the form (existing `ADMIN_INVITE_CODE`).
  - Role dropdown: `main_admin`, `moderator`, `service_delivery`, `technical`, `billing`.
  - Edge function `admin-signup` updated to accept `role` param and assign it (instead of hardcoded `admin`). Validates role is in the allowed list.
- Main admins can also create staff accounts from the existing `AdminUserManagement` panel with the same role picker.

## 3. Dashboards per Role

Each role gets its own route + dashboard component, pulling only their queue. Main Admin dashboard remains the existing `/admin` (full system).

### `/admin` — Main Admin (existing, unchanged)
Everything we already have: full apps list, AP map, plans manager, audit log, analytics, user management, system logs.

### `/moderator` — Moderator dashboard
Purpose: credit-vet incoming applications.
- **Inbox**: applications where `stage = 'moderation'` (newly submitted + items bounced back from later stages).
- **Application detail panel**:
  - Customer info, account type, ID number, address, building, service requested.
  - **Document previews** (ID, affirmation letter) using existing `DocumentPreview`.
  - **Requirements checklist** (auto-derived from account_type): ID present, contact valid, address present, affirmation letter (school/business), etc.
  - **Action bar**:
    - "Approve & send to Service Delivery" → comment optional.
    - "Reject" → comment **required**, returns to customer view as needs-info.
- **Stats strip**: pending count, avg time in moderation, today's throughput.
- **Create Application** button (existing `CreateApplicationDialog`) — moderators can create on behalf of walk-ins.
- History tab: applications they've already acted on (read-only).

### `/service-delivery` — Service Delivery dashboard
Purpose: validate feasibility & attach advisory note.
- **Inbox**: `stage = 'service_delivery'`.
- **Detail panel**:
  - Full applicant data + moderator's approval comment.
  - **Coverage check**: small map showing the application location vs nearest fiber node / AP (reuse `LeafletMap` in compact mode).
  - **Advisory note editor** (rich textarea) — required before approve; saved as `application_stage_actions` with `action='note'`.
  - **Action bar**:
    - "Approve & send to Technical" (advisory note required).
    - "Send back to Moderator" (comment required).
- **Stats**: queue size, approval rate, avg turnaround.

### `/technical` — Technical dashboard
Purpose: provision assets.
- **Inbox**: `stage = 'technical'`.
- **Detail panel**:
  - Service plan, location, advisory note from Service Delivery.
  - **Provisioning form**: assign SIM (text), port number (text), equipment list (multi-line), assign field technician (dropdown from `technician` role users), scheduled installation date.
  - These map to new fields on `applications`: `assigned_sim`, `assigned_port`, `assigned_equipment` (jsonb), reuse existing `technician` + `scheduled_date`.
  - **Action bar**:
    - "Approve & send to Billing" (provisioning data required).
    - "Send back to Service Delivery" (comment required).
- **Stats**: provisioning queue, AP utilization gauge (reuse from analytics).

### `/billing` — Billing dashboard
Purpose: confirm payment.
- **Inbox**: `stage = 'billing'`.
- **Detail panel**:
  - Selected plan + price, customer info, provisioning summary.
  - **Payment form**: payment method, reference number, amount, receipt upload (storage bucket `payment-receipts`, new), date.
  - **Action bar**:
    - "Confirm payment & complete" → stage becomes `completed`, customer notified.
    - "Send back to Technical" — only valid reasons enforced via dropdown: `Payment details missing` or `No payment received`. Comment required.
- **Stats**: pending payments, completed today, revenue this month.

### Shared dashboard chrome
A single `<StageDashboardLayout>` component renders header + stats strip + queue table + detail drawer, parameterised by stage. Each role page is a thin wrapper that supplies the stage and the action handlers. This avoids 4 near-duplicate files.

## 4. Customer-Facing Updates

- Track page shows the **stage stepper** (Moderation → Service Delivery → Technical → Billing → Completed) instead of the current free-text status, with timestamps.
- If rejected at any stage, customer sees a friendly reason (sanitised — internal advisory notes never shown).
- Notifications fire on every stage transition.

## 5. Routing & Access Control

- `ProtectedRoute` extended to accept `requiredRole` of any of the new roles.
- After login, role-based redirect:
  - `main_admin` → `/admin`
  - `moderator` → `/moderator`
  - `service_delivery` → `/service-delivery`
  - `technical` → `/technical`
  - `billing` → `/billing`
  - `technician` → `/tech`
  - `customer` → `/dashboard`

Navbar shows only the link relevant to the user's role.

## 6. Audit & Notifications

- Every stage action writes to `admin_audit_log` (already exists) AND `application_stage_actions`.
- Customer notification on every forward move + on rejection (with sanitised reason).
- Internal notification to receiving role's users when an item lands in their queue.

## 7. Build Order (proposed phases)

1. **Phase A — Foundation (this turn after approval)**: migration (enum + columns + new table + RLS), promote current admins to `main_admin`, update `admin-signup` to accept role, extend signup UI with role picker. This unlocks role assignment.
2. **Phase B — Stage engine**: shared `StageDashboardLayout`, stage-action service (`approveStage`, `rejectStage` with required comment), updated Track stepper.
3. **Phase C — Per-role dashboards**: `/moderator`, `/service-delivery`, `/technical`, `/billing` pages wired up.
4. **Phase D — Polish**: payment receipts bucket, role-aware navbar/redirects, customer-friendly rejection messaging.

## Technical notes

- Keep the legacy `admin` role in the enum; treat it as alias of `main_admin` in RLS (`has_role(uid,'admin') OR has_role(uid,'main_admin')`) so nothing breaks mid-migration.
- Stage transitions go through a single Postgres function `advance_application_stage(app_id, action, comment)` that enforces "must be at expected stage", "comment required on reject", and writes the action + history rows atomically. Frontends call it via `supabase.rpc`.
- New `payment-receipts` storage bucket, private, RLS: billing + main_admin write/read; customer reads only their own.

After you approve this plan I'll execute Phase A (DB migration + signup role picker) and report back before moving to Phase B.