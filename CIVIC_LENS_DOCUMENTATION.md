# Civic Lens AI — Full Project Documentation (Hardened v2.0)

> **Version:** 2.0.0 | **Status:** Security-Hardened | **Classification:** Internal Project Document  
> **Prepared By:** Civic Lens AI Project Team | **Date:** March 2026  
> **Previous Version:** 1.0.0 | **Security Review Applied:** March 2026  
> ⚠️ This version supersedes v1.0.0 and incorporates fixes for all 38 identified security vulnerabilities.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Goals and Objectives](#3-goals-and-objectives)
4. [Stakeholders and User Roles](#4-stakeholders-and-user-roles)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [System Architecture](#7-system-architecture)
8. [Module-Wise Feature Breakdown](#8-module-wise-feature-breakdown)
9. [Database Schema and Data Models](#9-database-schema-and-data-models)
10. [AI and Machine Learning Components](#10-ai-and-machine-learning-components)
11. [API Design and Integration](#11-api-design-and-integration)
12. [Security and Privacy Framework](#12-security-and-privacy-framework)
13. [UI/UX Design Guidelines](#13-uiux-design-guidelines)
14. [Notification and Communication System](#14-notification-and-communication-system)
15. [Analytics and Reporting](#15-analytics-and-reporting)
16. [Offline Mode and Low-Bandwidth Support](#16-offline-mode-and-low-bandwidth-support)
17. [Scalability and Cloud Infrastructure](#17-scalability-and-cloud-infrastructure)
18. [Technology Stack](#18-technology-stack)
19. [Development Roadmap and Milestones](#19-development-roadmap-and-milestones)
20. [Risk Assessment and Mitigation](#20-risk-assessment-and-mitigation)
21. [Testing Strategy](#21-testing-strategy)
22. [Deployment Strategy](#22-deployment-strategy)
23. [Maintenance and Support Plan](#23-maintenance-and-support-plan)
24. [Glossary](#24-glossary)
25. [Appendices](#25-appendices)
26. [Security Hardening Changelog](#26-security-hardening-changelog)

---

## 1. Executive Summary

**Civic Lens AI** is an AI-powered civic issue management platform designed to bridge the longstanding communication and accountability gap between citizens and municipal bodies. By combining computer vision, geolocation, real-time collaboration, and smart analytics, the platform transforms the fragmented, paper-based, or siloed grievance redressal systems that currently plague most municipalities into a unified, transparent, and data-driven ecosystem.

Citizens can report civic issues — potholes, garbage accumulation, broken streetlights, water leakage, open manholes, and more — by simply uploading a photo or video from their mobile device. The AI engine automatically classifies the issue, detects its severity, checks for duplicates, verifies the location, and assigns it to the appropriate municipal department. Authorities receive a real-time dashboard with prioritized task queues, while citizens can track every update end-to-end.

The platform is built for scale: it supports multiple cities, multiple languages, low-bandwidth environments, and integration with existing government grievance portals and smart city infrastructure. With predictive maintenance capabilities, Civic Lens AI doesn't just react to civic problems — it anticipates and helps prevent them.

**Key Outcomes Expected:**
- Reduction in average issue resolution time by 40–60%.
- Elimination of duplicate complaints through smart clustering.
- Increase in citizen trust and participation through transparent tracking.
- Data-driven policy decisions for municipal planning and infrastructure investment.
- Measurable accountability for field workers and departments.

---

## 2. Project Overview

| Attribute | Details |
|---|---|
| **Project Name** | Civic Lens AI |
| **Project Type** | Web & Mobile Application (Civic Tech / GovTech) |
| **Target Users** | Citizens, Municipal Authorities, Administrators |
| **Primary Domain** | E-Governance, Smart Cities, Urban Infrastructure |
| **Deployment Model** | Cloud-native, Multi-tenant SaaS |
| **Supported Platforms** | Web (Desktop & Mobile Browser), Android App, iOS App |
| **Multi-Language** | Yes — English + regional language support |
| **Offline Support** | Yes — Progressive Web App (PWA) with sync |
| **AI Capabilities** | Computer Vision, NLP, Predictive Analytics, Clustering |
| **Integration** | Government portals, Map APIs, SMS/Email, Smart City APIs |
| **Security Standard** | OWASP Top 10 compliant, ISO 27001 aligned, PDPB-ready |

### 2.1 Problem Statement

Municipal bodies in most cities receive thousands of complaints every day through fragmented channels — phone calls, physical letters, social media, dedicated portals, and in-person visits. This leads to:

- **Duplicate reporting** of the same issue by multiple citizens.
- **Misrouting** of complaints to wrong departments, causing delays.
- **Lack of transparency** — citizens have no visibility once they file a complaint.
- **Inconsistent prioritization** — urgent hazards are not always treated with urgency.
- **No accountability** — resolution can be claimed without actual work being done.
- **Language barriers** — non-English speakers face difficulty accessing portals.
- **Digital exclusion** — low-literacy users cannot navigate complex interfaces.

### 2.2 Scope

**In Scope:** Citizen-facing interface, AI pipeline, authority dashboard, admin panel, notification system, map integration, offline mode, SOS reporting, multi-language support, analytics.

**Out of Scope (Phase 1):** Payment processing, full government DB integration, real-time video streaming, autonomous drone/IoT integration.

---

## 3. Goals and Objectives

### 3.1 Primary Goals

1. **Democratize Civic Participation** — Any citizen, any device, any language.
2. **Accelerate Issue Resolution** — Intelligent routing, priority scoring, escalation.
3. **Enforce Accountability** — GPS-verified photo evidence for every resolution.
4. **Eliminate Redundancy** — AI duplicate detection + clustering.
5. **Enable Predictive Governance** — Historical data → preventive maintenance.
6. **Protect Citizen Privacy** — Privacy-by-design architecture.

### 3.2 Measurable Objectives

| Objective | Target | Timeline |
|---|---|---|
| Active citizen users per city | 10,000+ | 6 months |
| Average resolution time | < 7 days (Tier 1) | 12 months |
| Duplicate complaint reduction | 70% fewer | 3 months |
| False report rate | < 3% | Ongoing |
| Citizen satisfaction | ≥ 4.0/5.0 | 6 months |
| Authority adoption | 85% daily | 4 months |
| Predictive accuracy | 75%+ precision | 18 months |
| False positive rate (fraud) | ≤ 1% | Ongoing |

---

## 4. Stakeholders and User Roles

### 4.1 User Role Definitions

**Citizen:** Report issues, track status, upvote nearby complaints (district-restricted), SOS, rate resolutions (24h delay), appeal moderation.

**Municipal Authority:** Dashboard, assign field workers, upload verified evidence, escalation management, analytics.

**Field Worker:** View assigned tasks, update status, upload geo-tagged proof, GPS navigation. MFA mandatory.

**Administrator:** Full user management, moderation, dual-approval bans, AI config, city/jurisdiction config (dual-admin for boundary changes), audit logs.

---

## 5. Functional Requirements

### 5.1 Authentication
- FR-01: Citizen self-registration (email, phone, social login).
- FR-02 **[VULN-005]**: Authority accounts require verified govt email + explicit admin approval.
- FR-04 **[VULN-035]**: MFA mandatory for authority, field worker, admin.
- FR-07 **[VULN-003]**: RBAC enforced at API gateway AND service level.

### 5.2 Issue Reporting
- FR-08: EXIF metadata stripped server-side before storage.
- FR-12: AI-suggested category shown; citizen can override.
- FR-14 **[VULN-025]**: Offline complaints rate-limited at sync time (max 10/24h batch).
- FR-16-A **[VULN-010]**: `Idempotency-Key` required; 24h dedup cache.
- FR-16-B **[VULN-006]**: Strict allowlist DTO — only `category_override`, `description`, `lat`, `lng`, `media_ids`, `idempotency_key` are citizen-writable.

### 5.3 AI Classification
- FR-18 **[VULN-015]**: Critical severity → mandatory human review before alert dispatch.
- FR-21 **[VULN-017]**: Duplicate detection uses geographic proximity + address-level matching + semantic similarity.

### 5.4 Status Tracking
- FR-27 **[VULN-028]**: Dual SLA timers — total elapsed (never resets) + since last status transition. Notes do NOT reset timers. 2× SLA forces escalation.
- FR-28 **[VULN-029]**: Citizens can dispute within 14 days. Rating requires 24h delay after resolution.

### 5.5 SOS
- FR-29 **[VULN-001]**: Device-bound anonymous session token required. Unverified-source tier if not logged in.
- FR-30 **[VULN-001]**: Rate limit: 2 SOS/hour/device. Exceeding triggers SMS OTP before further SOS.

### 5.6 Authority Dashboard
- FR-39 **[VULN-027]**: Resolution requires evidence with GPS within 50m, timestamp after assignment, AI resolution confirmation, reverse image search.

### 5.7 Community Validation
- FR-41 **[VULN-026]**: One upvote per account per complaint (unique DB constraint), district proximity required, anomaly detection for bot upvotes.
- FR-43 **[VULN-007]**: Community media via separate endpoint, flagged "Unverified Community Contribution", does NOT feed AI re-analysis.

### 5.8 Moderation & Appeals
- FR-54 **[VULN-030]**: Penalties require mandatory justification. Appeals routed to different admin. Permanent bans require dual-admin. "This is Real" fast-track 2h review.

---

## 6. Non-Functional Requirements

- **NFR-04**: SOS pathway 99.99% uptime (separate load balancer, multi-AZ).
- **NFR-09**: TLS 1.3 external; mTLS service-to-service via Istio.
- **NFR-10**: AES-256-GCM application-level column encryption for PII (KMS-managed).
- **NFR-11 [VULN-002]**: JWT access tokens (15 min) with `aud` claim per service; per-tier signing keys; refresh token rotation with family tracking.
- **NFR-20 [VULN-013]**: Append-only audit trail with hash chain + WORM S3 mirror + INSERT-only app privilege.
- **NFR-14 [VULN-034]**: SBOM maintained; all dependencies pinned; Snyk + Dependabot in CI/CD.

---

## 7. System Architecture

### 7.1 Architecture Overview

```
CLIENT LAYER: Mobile App (React Native) | Web App (React.js PWA)
       │
API Gateway (Kong, Multi-AZ, AWS Shield Advanced, WAF, mTLS)
       │
Dedicated SOS Load Balancer (separate, hardened, multi-AZ) [VULN-024]
       │ mTLS to all services
  ┌────┼────────────────────────────────┐
Auth  Complaint Svc    Notification Svc
Svc   (Strict DTOs,    (DPA-compliant,
      Idempotency)     on-device STT)
       │
  ┌────┼──────────────────────┐
AI Svc  Geo Svc    Analytics Svc
(mTLS)  (RFC7946)  (Anonymized only)
       │
Kafka (ACLs + Schema Registry) {env}.{city_id}.{event_type}
       │
PostgreSQL (RLS) | S3 (Pre-signed, KMS) | Redis (Revocation, Rate limit)
```

### 7.2 Hardened Complaint Submission Flow

```
Citizen Upload → JWT+aud validation → Rate limit
→ Idempotency-Key check → Strict DTO validation
→ Media → S3 (EXIF stripped, KMS encrypted, key stored only)
→ AI Service (mTLS): classifier + severity + dedup
  → Critical severity? → Human review queue (not auto-dispatched)
→ Geo Service (mTLS): GPS validation + RFC7946 boundary check
→ Kafka event: {env}.{city_id}.complaint.verified
→ Notification (user's language) + Authority dashboard
```

---

## 8. Module-Wise Feature Breakdown

### Module 1: Citizen App
Report Wizard (strict DTO, idempotency, EXIF stripped) | My Complaints | SOS (device token, 2/hr) | Offline Mode (sync-time rate limiting) | Voice (on-device STT) | Moderation Appeal Center

### Module 2: Authority Dashboard
Complaint Queue (RLS-scoped) | Map View (pre-signed URLs) | Evidence Upload (GPS/timestamp/AI validated) | Dual SLA Timer Display | Department Analytics (anonymized)

### Module 3: Admin Panel
User Management (all actions logged) | Moderation Queue (2h SLA) | Penalty Management (dual-admin bans, appeal routing) | City Config (dual-admin boundary approval, RFC7946 validated) | Audit Logs (append-only + hash chain)

### Module 4: AI Engine
Classification (adversarial tested) | Severity Scoring (Critical → human review) | Duplicate Detection (geo + address + semantic) | False Report Detection (FPR ≤ 1%) | Training Data Curation (anti-poisoning) | Resolution Verification

---

## 9. Database Schema and Data Models

### 9.1 Key Tables

**`users`** — PII columns (`phone`, `email`, `full_name`) stored as AES-256-GCM ciphertext with HMAC hashes for lookup. `authority_approved` boolean requires admin approval. `kms_key_version` for rotation tracking. RLS: city isolation.

**`complaints`** — `anonymous_token` replaces `citizen_id` in public-facing queries. `lat_grid`/`lng_grid` are rounded (~1km grid) for public record. Server-controlled fields: `severity`, `is_duplicate`, `upvote_score`, `assigned_to`, `ai_confidence`, `flagged_as_false`. `idempotency_key` unique. Dual SLA columns: `created_at` (never resets) + `last_status_change_at`.

**`complaint_locations`** — Precise GPS stored separately. RLS restricts access to `ai_service` and `geo_service` only. [VULN-019]

**`complaint_status_history`** — Append-only with cryptographic hash chain (`prev_row_hash`, `row_hash`). `resets_sla_clock` generated column: true only for `status_transition`. Immutability trigger blocks UPDATE/DELETE.

**`complaint_media`** — Stores `s3_object_key` only (no permanent URLs). `sha256_hash` for integrity. Evidence validation fields: `evidence_gps_valid`, `evidence_timestamp_valid`, `evidence_ai_valid`.

**`complaint_upvotes`** — PK: `(complaint_id, citizen_id)` enforces one upvote per citizen per complaint.

**`ratings`** — `earliest_allowed_at = resolved_at + 24h` enforced by CHECK constraint.

**`audit_logs`** — Append-only + hash chain + WORM S3 mirror. `justification` field mandatory for moderation actions. INSERT-only app privilege; immutability trigger.

**`refresh_token_families`** — Tracks token rotation. `is_compromised` = true if replayed token detected → entire family invalidated.

**`sos_device_tokens`** — Device fingerprint (HMAC), trust tier (`verified`/`unverified_source`), hourly SOS count.

**`webhook_partners`** — HMAC secret hash, IP allowlist, allowed event types.

### 9.2 RBAC Permission Matrix

| Resource | Citizen | Authority | Field Worker | Admin |
|---|---|---|---|---|
| complaints: create | ✅ own | ❌ | ❌ | ✅ |
| complaints: read jurisdiction | ❌ | ✅ | ❌ | ✅ |
| complaints: update status | ❌ | ✅ | ✅ assigned | ✅ |
| complaint_locations: read precise | ❌ | ✅ jurisdiction | ✅ assigned | ✅ |
| upvotes: create | ✅ district match | ❌ | ❌ | ❌ |
| ratings: create | ✅ own, 24h delay | ❌ | ❌ | ❌ |
| audit_logs: read | ❌ | ❌ | ❌ | ✅ |
| cities.boundary: update | ❌ | ❌ | ❌ | ✅ dual-admin |
| ai_service: call | indirect only | indirect | indirect | indirect |

---

## 10. AI and Machine Learning Components

### 10.1 Issue Classification
- **Model:** ResNet-50 / EfficientNet-B4 fine-tuned on civic issue dataset.
- **Adversarial robustness [VULN-015]:** Input preprocessing (JPEG re-compress + random crop). FGSM/PGD training augmentation. Mandatory robustness testing before production promotion.
- **Confidence threshold:** < 0.6 → human review. Critical → always human review.
- **Targets:** Top-1 ≥ 85%, Top-3 ≥ 95%, FPR ≤ 1% (stratified by device/region).

### 10.3 Duplicate Detection [VULN-017]
- Stage 1: Geo radius (100m default) + address-level matching (independent).
- Stage 2: Semantic similarity — `0.6 × image_sim + 0.4 × text_sim ≥ 0.80` → duplicate.
- High-severity: Stage 2 runs independently regardless of Stage 1.

### 10.5 Training Data Pipeline [VULN-016]
- Mandatory human curation before any data enters training pool.
- Golden test set (immutable) checked every retraining cycle; >3% drop → reject model.
- Data provenance tracked per example. Influence function analysis per model version. Full rollback capability.

### 10.6 Resolution Verification [VULN-027]
- AI classifies evidence photo to confirm issue appears resolved.
- Low confidence → human inspector required before marking Resolved.

---

## 11. API Design and Integration

### 11.1 Principles
- `/api/v1/` versioned. JWT with `aud` claim. Signed opaque cursor pagination (HMAC). `Idempotency-Key` on all mutating endpoints. Strict DTO allowlist (Pydantic `extra='forbid'`).

### 11.2 Key Endpoints

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/v1/complaints` | Strict DTO; Idempotency-Key; citizen fields only |
| GET | `/api/v1/complaints/:id/media/:media_id` | Pre-signed URL, 15-min expiry |
| POST | `/api/v1/complaints/:id/community-media` | Flagged unverified; no AI re-analysis |
| POST | `/api/v1/complaints/:id/resolve` | Evidence GPS/timestamp/AI validated |
| POST | `/api/v1/sos` | Device token; 2/hr/device; dedicated LB |
| POST | `/api/v1/auth/sos-device-token` | Device fingerprint; 24h expiry |
| POST | `/api/v1/auth/refresh` | Token rotation; replay → family invalidated |

### 11.3 Webhook Security [VULN-008]
`X-Webhook-Signature: HMAC-SHA256(secret, payload+timestamp)` + `X-Webhook-Timestamp` (5-min replay window) + IP allowlist + registered event types.

### 11.4 External Integrations
DPA required with all: Google Maps, Twilio, FCM, SendGrid, AWS S3/KMS, OpenStreetMap, OpenWeatherMap, Government Grievance Portal, Smart City Command Centre.

---

## 12. Security and Privacy Framework

### 12.2 Encryption Summary

| Data | Method |
|---|---|
| In Transit | TLS 1.3 external; mTLS service-to-service |
| PII at Rest | AES-256-GCM, application-level, KMS-managed |
| Passwords | bcrypt cost ≥ 12 |
| Media | SSE-KMS in S3 (customer-managed key) |
| Audit Logs | WORM S3 + hash chain |

### 12.3 Privacy
- Precise GPS decoupled from citizen identity in `complaint_locations` (RLS-restricted to AI/Geo services). [VULN-019]
- Community feed: Safety Hazard categories hidden until resolved. Unauthenticated: district-level only. [VULN-020]
- Voice: on-device STT preferred; cloud only with explicit consent; raw audio never stored. [VULN-021]
- Right to deletion: PII anonymized within 72h; complaint records anonymized immediately.

### 12.4 Key Security Controls

| Control | Implementation |
|---|---|
| Rate Limiting | 100/min/user; SOS 2/hr/device |
| mTLS | Istio service mesh, all services |
| Network Policies | Kubernetes: only complaint-svc → ai-svc |
| Media URLs | Pre-signed, 15-60 min expiry, EXIF stripped |
| Audit | Append-only + hash chain + WORM S3 |
| Supply Chain | SBOM (CycloneDX); pinned deps; Snyk; Dependabot |
| Pen Testing | Quarterly (includes AI/ML attack classes) |

### 12.2 Secret Rotation Schedule [VULN-031]

| Secret | Frequency |
|---|---|
| DB credentials | 30 days (Vault dynamic) |
| JWT signing keys | 90 days (dual-key window) |
| External API keys | 180 days |
| KMS DEKs | 365 days |
| Webhook secrets | 90 days |

---

## 13. UI/UX Design Guidelines

**Design Philosophy:** Clarity first. Inclusive by default. Trust through transparency. Privacy-respecting (community feed defaults to district-level).

**Color System:**

| Role | Color | Hex |
|---|---|---|
| Primary Brand | Civic Blue | `#1A56DB` |
| Secondary | Governance Green | `#057A55` |
| Danger/Critical | Alert Red | `#E02424` |
| Warning/High | Amber | `#D97706` |
| Success/Resolved | Emerald | `#059669` |

**Key Screens:** Citizen: Home (district-level map) → Report Wizard (camera → location → AI category → confirm) → My Complaints (dual SLA display) → Appeal Center. Authority: Queue + Evidence Upload with GPS/timestamp/AI validation badges.

---

## 14. Notification and Communication System

| Event | Recipient | Channels | Priority |
|---|---|---|---|
| SOS triggered | Nearby Authorities | Push, SMS | Critical |
| SLA breach | Authority | Push, Email | High |
| Moderation penalty | Citizen | Push, Email + appeal link | High |
| Rating window open | Citizen | Push | Low |
| Secret rotation due | Admin | Email | High |

DND respected for non-critical. SOS and Critical bypass DND.

---

## 15–17. Analytics, Offline Mode, and Scalability

**Analytics:** All pipelines on anonymized data only. Grid-snapped coordinates for heatmaps. No PII in exports.

**Offline Mode [VULN-025]:** IndexedDB + Background Sync. Sync-time checks: idempotency dedup, 10-complaint/24h batch throttle, conflict detection.

**Cloud:** AWS EKS + Istio. PostgreSQL (RLS, column encryption). Kafka (ACLs + Schema Registry, topic: `{env}.{city_id}.{event_type}`). S3 (private, SSE-KMS, pre-signed URLs). Redis (revocation + rate limit). Dedicated SOS ALB. DR: RTO 1h, RPO 15min, quarterly drills.

---

## 18. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (PWA), React Native, Mapbox, i18next |
| Backend | Python FastAPI (Pydantic DTOs), Node.js Auth, Celery, Istio |
| AI/ML | PyTorch, TorchServe (SageMaker private endpoint), Qdrant |
| Data | PostgreSQL 15 + PostGIS (RLS), Redis 7, Kafka (AWS MSK) |
| DevOps | Docker, EKS, GitHub Actions, ArgoCD, Terraform, Vault |
| Security | Semgrep (SAST), OWASP ZAP (DAST), Snyk, CycloneDX SBOM |

---

## 19. Development Roadmap

| Phase | Duration | Key Milestones |
|---|---|---|
| Phase 0: Foundation | Months 1–2 | Hardened infra, Auth, DB schema with RLS+encryption, Kafka ACLs, DPAs executed |
| Phase 1: MVP | Months 3–5 | Complaint flow with strict DTOs, SOS, AI classifier, OWASP ZAP checkpoint |
| Phase 2: Intelligence | Months 6–8 | Curated training pipeline, duplicate detection, upvoting, evidence validation, pen test |
| Phase 3: Analytics & Scale | Months 9–11 | Analytics, multi-city, offline sync, DR drill, load test 100k users |
| Phase 4: Growth | Months 12–18 | Predictive maintenance, ISO 27001 audit, 20+ cities |

---

## 20. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Adversarial image attacks | Medium | Critical | Robustness testing in CI; input preprocessing; Critical → human review |
| Training data poisoning | Medium | Critical | Curated pipeline; golden test set; rollback |
| SOS channel DDoS | Medium | Critical | Dedicated hardened LB; 2/hr/device limit; device token gating |
| GPS history exposure via breach | Medium | Critical | Precise GPS in separate RLS-restricted table |
| JWT theft | Low | High | `aud` scoping; family tracking; revocation list |
| Kafka cross-tenant leakage | Medium | High | ACLs; Schema Registry; integration tests |
| Fake resolution evidence | Medium | High | GPS/timestamp/AI validation; reverse image search |
| Training data poisoning | Medium | Critical | Human curation; golden test set; influence analysis |

---

## 21. Testing Strategy

- **Unit:** ≥ 80% coverage (pytest, Jest).
- **Integration:** RLS + Kafka ACLs + RBAC matrix in tests.
- **E2E:** Full flows including offline sync, 24h rating delay, appeal flow (Playwright, Detox).
- **AI:** Golden test set; adversarial (FGSM/PGD/C&W < 5% accuracy drop); stratified FPR ≤ 1%.
- **Security:** OWASP ZAP (per release), Semgrep (per PR), quarterly pen test (AI/ML scope), annual supply chain review.
- **DR:** Quarterly drills with documented RTO/RPO. Monthly SOS failover test.

**Quality gates:** No merge without passing tests, no critical CVEs, Semgrep clean, peer review ×2. No model promotion without golden set + adversarial tests.

---

## 22. Deployment Strategy

- Blue/Green with automated rollback if error rate > 1% within 10 minutes.
- GitOps via ArgoCD (signed Git tags).
- Canary releases for AI models (5% traffic → monitor → full rollout).
- Zero-downtime JWT rotation (dual active signing keys during window).

---

## 23. Maintenance and Support

**On-call:** P0 < 15min, P1 < 1hr, P2 < 4hr. SOS has separate P0 runbook.

**Model Maintenance:** Quarterly retraining (curated data only). Golden set regression check. Drift alert at >5% degradation. Annual AI security audit.

**Data Retention:** Active complaints 5 years → anonymized. PII zeroed within 72h of deletion. Audit logs 7 years (WORM S3). Token revocation list pruned at 90 days.

---

## 24. Glossary

| Term | Definition |
|---|---|
| Anonymous Token | Non-identifying UUID replacing `citizen_id` in public records |
| Device-Bound Token | Credential tied to device fingerprint enabling SOS without full login |
| DPA | Data Processing Agreement with third-party processors |
| Golden Test Set | Immutable curated dataset for AI evaluation at every retraining cycle |
| Hash Chain | Cryptographic structure enabling tamper detection in audit logs |
| mTLS | Mutual TLS — both sides authenticate via certificates |
| SLA Dual Timer | (a) total elapsed (never resets) + (b) since last status transition |
| Token Family | Group of refresh tokens; replay invalidates entire family |
| WORM | Write Once Read Many — prevents modification/deletion of stored data |

---

## 25. Appendices

### Appendix A: Issue Category Taxonomy

```
Road & Transport | Sanitation & Waste | Water Supply | Electricity & Street Lighting
Public Safety Hazards ⚠️ (location-restricted until resolved)
Parks & Public Spaces | Environmental
```

### Appendix C: AI Model Performance Targets

| Model | Metric | Target |
|---|---|---|
| Issue Classifier | Top-1 Accuracy | ≥ 85% |
| Issue Classifier | Adversarial Robustness | < 5% drop under FGSM/PGD |
| Duplicate Detector | Precision / Recall | ≥ 90% / ≥ 85% |
| False Report Detector | FPR | ≤ 1% (stratified) |

### Appendix D: API Rate Limits

| Role | Endpoint | Limit |
|---|---|---|
| Citizen | Complaint submission | 10/day |
| Citizen | SOS | 2/hour/device |
| Citizen | Upvote | 50/day (district-filtered) |
| Unauthenticated | Community feed | 60/hour |

### Appendix F: Evidence Validation Checklist [VULN-027]

| Check | Pass Condition | Failure |
|---|---|---|
| GPS | Within 50m of complaint | Reject, re-upload required |
| Timestamp | After `created_at` AND after assignment | Reject |
| Image Hash | Not matching previously uploaded evidence | Route to admin |
| AI Resolution | Confidence ≥ 0.7 issue appears resolved | Human inspector required |
| Critical/SOS | Independent inspector sign-off | Block until approved |

---

## 26. Security Hardening Changelog

All 38 vulnerabilities fixed in v2.0 vs v1.0:

| Vuln ID | Severity | Fix Summary |
|---|---|---|
| VULN-001 | 🔴 Critical | SOS device-bound token; 2/hr/device limit; unverified-source tier; dedicated LB |
| VULN-002 | 🔴 Critical | JWT `aud` claims per service; per-tier signing keys; token binding |
| VULN-003 | 🟠 High | Explicit RBAC matrix; object-level auth enforced in every service |
| VULN-004 | 🟠 High | Refresh token rotation + family tracking + replay detection |
| VULN-005 | 🟡 Medium | Authority: email domain + admin approval + security alert on registration |
| VULN-006 | 🔴 Critical | Strict allowlist DTOs; Pydantic `extra='forbid'`; server-only fields rejected |
| VULN-007 | 🟠 High | Community media: separate endpoint, flagged unverified, no AI influence |
| VULN-008 | 🟠 High | Webhook HMAC-SHA256 + 5-min replay protection + IP allowlist |
| VULN-009 | 🟡 Medium | Signed opaque cursors; location precision capped per role |
| VULN-010 | 🟡 Medium | `Idempotency-Key` required; 24h dedup; submission hash |
| VULN-011 | 🔴 Critical | PostgreSQL RLS on all tenant-scoped tables |
| VULN-012 | 🟠 High | PII column encryption AES-256-GCM + HMAC lookup hashes |
| VULN-013 | 🟠 High | Append-only audit + immutability trigger + hash chain + WORM S3 |
| VULN-014 | 🟡 Medium | RFC7946 + PostGIS `ST_IsValid()` for GeoJSON; dual-admin boundary approval |
| VULN-015 | 🔴 Critical | Adversarial robustness testing mandatory; input preprocessing; Critical → human review |
| VULN-016 | 🔴 Critical | Curated training pipeline; golden test set; provenance; influence analysis; rollback |
| VULN-017 | 🟠 High | Address-level dedup + geo; Stage 2 independent for high-severity |
| VULN-018 | 🟡 Medium | FPR ≤ 1%; stratified evaluation; 2h moderation SLA; one-tap appeal |
| VULN-019 | 🔴 Critical | Precise GPS in separate `complaint_locations` (RLS: AI/Geo only) |
| VULN-020 | 🟠 High | Safety Hazards hidden from public feed until resolved |
| VULN-021 | 🟡 Medium | On-device STT preferred; cloud only with explicit consent; no audio storage |
| VULN-022 | 🟠 High | Kafka ACLs; `{env}.{city_id}.{event_type}` naming; Schema Registry; cross-city tests |
| VULN-023 | 🟠 High | S3 object key only; pre-signed URLs 15-60 min; EXIF stripped on upload |
| VULN-024 | 🟡 Medium | API Gateway multi-AZ; dedicated SOS ALB; AWS Shield Advanced |
| VULN-025 | 🟡 Medium | Sync-time rate limiting; idempotency at sync; `offline_queued_at` column |
| VULN-026 | 🟠 High | District proximity + unique DB constraint + weighted score + anomaly detection |
| VULN-027 | 🟠 High | Evidence: GPS 50m + timestamp + AI + reverse image check (Appendix F) |
| VULN-028 | 🟡 Medium | Dual SLA timer; notes don't reset; 2× SLA forces escalation |
| VULN-029 | 🟡 Medium | 24h rating delay; dept-colluding block; independent inspector for Critical; 14-day dispute |
| VULN-030 | 🟡 Medium | Mandatory justification; appeal to different admin; dual-admin bans; ombudsman |
| VULN-031 | 🟠 High | Explicit rotation schedule; Vault dynamic secrets; dual-key JWT rotation; overdue alerts |
| VULN-032 | 🟠 High | Istio mTLS all services; Kubernetes NetworkPolicies restrict AI to complaint-svc |
| VULN-033 | 🟡 Medium | Quarterly DR drills documented; monthly SOS failover; Chaos Engineering; runbooks |
| VULN-034 | 🟢 Low | SBOM (CycloneDX); pinned deps; Snyk + Dependabot; security review gate |
| VULN-035 | 🟢 Low | MFA mandatory for field workers; certificate pinning / MDM |
| VULN-036 | 🟡 Medium | DPA required with all third-party processors before activation |
| VULN-037 | 🟢 Low | PII anonymization within 72h of deletion (not 30 days) |
| VULN-038 | 🟢 Low | Pen test scope includes AI/ML: adversarial, membership inference, model inversion, extraction |

---

*End of Document — Civic Lens AI Hardened v2.0 — March 2026*
