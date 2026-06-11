# API Specification — Kronos Lead Intelligence
**Version:** Phase 2  
**Base URL:** `http://localhost:3000/api`  
**Content-Type:** `application/json` for all requests and responses  

---

## Overview

All endpoints follow consistent conventions:

| Convention | Detail |
|-----------|--------|
| Success body | Resource object or `{ data: [...], total: N }` for lists |
| Validation error | `{ error: "Validation failed", details: { fieldErrors: {...}, formErrors: [...] } }` |
| Not found | `{ error: "Resource not found" }` |
| Server error | `{ error: "message" }` |
| Dates | ISO 8601 strings (`2026-06-10T17:00:00.000Z`) |
| IDs | UUID strings |

---

## 1. Companies

### GET /api/companies

Returns a paginated, filterable, sortable list of companies.

**Query Parameters**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `country` | string | Exact match | `peru` |
| `industry` | string | Case-insensitive contains | `dental` |
| `priority` | string | `hot` \| `high` \| `medium` \| `low` | `hot` |
| `status` | string | `active` \| `contacted` \| `client` \| `archived` | `active` |
| `minScore` | integer 0–100 | `latestOpportunityScore >=` | `60` |
| `maxScore` | integer 0–100 | `latestOpportunityScore <=` | `90` |
| `sort` | string | `score_desc` (default) \| `score_asc` \| `created_asc` \| `updated_desc` | `score_desc` |
| `limit` | integer 1–200 | Records per page (default 100) | `20` |
| `offset` | integer ≥0 | Skip N records (default 0) | `0` |

**Request**
```
GET /api/companies?priority=hot&sort=score_desc&limit=10
```

**Response 200**
```json
{
  "data": [
    {
      "id": "eae2e8da-...",
      "name": "Lima Capital Propiedades",
      "industry": "Inmobiliaria / Real Estate",
      "country": "peru",
      "city": "Lima",
      "status": "active",
      "leadSource": "linkedin",
      "latestOpportunityScore": 87,
      "latestPriorityLevel": "hot",
      "latestEvaluatedAt": "2026-06-08T09:00:00.000Z",
      "createdAt": "2026-06-10T17:13:40.000Z",
      "updatedAt": "2026-06-10T17:13:40.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

**Response 400** (invalid query params)
```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": { "minScore": ["Expected number, received nan"] },
    "formErrors": []
  }
}
```

---

### POST /api/companies

Creates a new company.

**Request Body**
```json
{
  "name": "Clínica Odontológica Norte",
  "industry": "Dental / Odontología",
  "country": "peru",
  "city": "Trujillo",
  "website": "https://clinicanorodental.pe",
  "whatsapp": "+51912345678",
  "instagram": "https://instagram.com/clinicanorodental",
  "linkedin": null,
  "googleBusinessUrl": null,
  "status": "active",
  "leadSource": "google_maps"
}
```

**Required fields:** `name`, `industry`, `country`  
**Optional fields:** `city`, `website`, `whatsapp`, `instagram`, `linkedin`, `googleBusinessUrl`, `status` (default `active`), `leadSource`

**Response 201**
```json
{
  "id": "a1b2c3d4-...",
  "name": "Clínica Odontológica Norte",
  "industry": "Dental / Odontología",
  "country": "peru",
  "city": "Trujillo",
  "website": "https://clinicanorodental.pe",
  "whatsapp": "+51912345678",
  "instagram": "https://instagram.com/clinicanorodental",
  "linkedin": null,
  "googleBusinessUrl": null,
  "status": "active",
  "leadSource": "google_maps",
  "latestOpportunityScore": 0,
  "latestPriorityLevel": "low",
  "latestEvaluatedAt": null,
  "createdAt": "2026-06-10T20:00:00.000Z",
  "updatedAt": "2026-06-10T20:00:00.000Z"
}
```

**Response 400** (missing required field)
```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "country": ["Invalid enum value. Expected 'peru' | 'mexico' | 'colombia' | 'chile' | 'spain'"]
    },
    "formErrors": []
  }
}
```

---

### GET /api/companies/[id]

Returns full company detail with latest evaluation and sales note embedded.

**Request**
```
GET /api/companies/eae2e8da-...
```

**Response 200**
```json
{
  "id": "eae2e8da-...",
  "name": "Lima Capital Propiedades",
  "industry": "Inmobiliaria / Real Estate",
  "country": "peru",
  "city": "Lima",
  "website": null,
  "whatsapp": "+51976543210",
  "instagram": null,
  "linkedin": null,
  "googleBusinessUrl": null,
  "status": "active",
  "leadSource": "linkedin",
  "latestOpportunityScore": 87,
  "latestPriorityLevel": "hot",
  "latestEvaluatedAt": "2026-06-08T09:00:00.000Z",
  "createdAt": "2026-06-10T17:13:40.000Z",
  "updatedAt": "2026-06-10T17:13:40.000Z",
  "latestEvaluation": {
    "id": "...",
    "companyId": "eae2e8da-...",
    "evaluatedBy": "alejandro@kronosdata.com",
    "signalHasWebsite": false,
    "signalHasWhatsapp": true,
    "opportunityScore": 87,
    "priorityLevel": "hot",
    "recommendedServices": ["Automatización de WhatsApp", "..."],
    "implementationDifficulty": "high",
    "estimatedProjectPriceMin": 9400,
    "estimatedProjectPriceMax": 22100,
    "estimatedLeadsLostPerMonth": 32,
    "estimatedRevenueLostPerMonth": 4800,
    "estimatedRoiPotential": 32,
    "evaluatedAt": "2026-06-08T09:00:00.000Z"
  },
  "salesNote": {
    "id": "...",
    "companyId": "eae2e8da-...",
    "contactName": "Rosa Villanueva",
    "contactStatus": "attempted",
    "closeProbability": 40
  }
}
```

**Response 404**
```json
{ "error": "Company not found" }
```

---

### PUT /api/companies/[id]

Updates company fields. All fields are optional — only sends changed fields.

**Request Body** (partial — send only what you want to change)
```json
{
  "status": "contacted",
  "whatsapp": "+51999888777"
}
```

**Response 200** — full updated company object

**Response 404**
```json
{ "error": "Company not found" }
```

---

### DELETE /api/companies/[id]

Permanently deletes the company and all related records (CASCADE).

**Request**
```
DELETE /api/companies/eae2e8da-...
```

**Response 204** — no body

**Response 404**
```json
{ "error": "Company not found" }
```

---

## 2. Evaluations

### POST /api/companies/[id]/evaluate

Runs the full evaluation pipeline and persists results. Creates a new evaluation record (append-only) and atomically updates `latestOpportunityScore`, `latestPriorityLevel`, `latestEvaluatedAt` on the company.

**Request Body**
```json
{
  "evaluatedBy": "alejandro@kronosdata.com",
  "signalHasWebsite": true,
  "signalHasWhatsapp": true,
  "signalHasContactForm": false,
  "signalHasBookingSystem": false,
  "signalHasInstagram": true,
  "signalHasLinkedin": false,
  "signalHasGoogleBusiness": false,
  "signalHasReviews": true,
  "signalHasUnansweredReviews": true,
  "signalHasClearCta": false,
  "signalHasLeadCapture": false,
  "signalSlowResponse": true,
  "signalWeakFollowup": true,
  "signalManualWork": false,
  "signalWeakOnlinePresence": false
}
```

**All 15 signal fields are required.** All are boolean.

**Response 201**
```json
{
  "id": "new-eval-uuid",
  "companyId": "eae2e8da-...",
  "evaluatedBy": "alejandro@kronosdata.com",
  "signalHasWebsite": true,
  "signalHasWhatsapp": true,
  "signalHasContactForm": false,
  "opportunityScore": 72,
  "priorityLevel": "high",
  "scoreLeadGeneration": 60,
  "scoreFollowUp": 100,
  "scoreConversionProcess": 100,
  "scoreAutomationOpportunity": 40,
  "scoreOnlinePresence": 20,
  "scoreReputation": 60,
  "detectedProblems": [
    "Sin formulario de contacto",
    "Sin sistema de reservas o citas",
    "..."
  ],
  "probablePainPoint": "Pérdida de leads en etapas clave...",
  "recommendedSolution": "Automatización de WhatsApp...",
  "estimatedValueMin": 900,
  "estimatedValueMax": 2625,
  "estimatedLeadsLostPerMonth": 24,
  "estimatedRevenueLostPerMonth": 1200,
  "estimatedRoiPotential": 8,
  "recommendedServices": ["Automatización de WhatsApp", "Sistema de Reservas y Citas", "..."],
  "implementationDifficulty": "medium",
  "implementationTimeEstimate": "3–6 semanas",
  "estimatedProjectPriceMin": 1800,
  "estimatedProjectPriceMax": 4300,
  "evaluatedAt": "2026-06-10T20:30:00.000Z",
  "updatedAt": "2026-06-10T20:30:00.000Z"
}
```

**Response 400** (missing signal field)
```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "signalHasWebsite": ["Required"]
    },
    "formErrors": []
  }
}
```

**Response 404**
```json
{ "error": "Company not found" }
```

---

### GET /api/companies/[id]/evaluations

Returns full evaluation history for a company, newest first. Supports the append-only audit trail.

**Request**
```
GET /api/companies/eae2e8da-.../evaluations
```

**Response 200**
```json
{
  "data": [
    {
      "id": "eval-uuid-2",
      "companyId": "eae2e8da-...",
      "opportunityScore": 72,
      "priorityLevel": "high",
      "evaluatedAt": "2026-06-10T20:30:00.000Z"
    },
    {
      "id": "eval-uuid-1",
      "companyId": "eae2e8da-...",
      "opportunityScore": 87,
      "priorityLevel": "hot",
      "evaluatedAt": "2026-06-08T09:00:00.000Z"
    }
  ],
  "total": 2
}
```

---

## 3. Outreach History

### GET /api/companies/[id]/outreach

Returns all outreach records for a company, newest first.

**Request**
```
GET /api/companies/eae2e8da-.../outreach
```

**Response 200**
```json
{
  "data": [
    {
      "id": "outreach-uuid",
      "companyId": "eae2e8da-...",
      "channel": "linkedin",
      "messageSent": "Hola Rosa...",
      "sentBy": "alejandro@kronosdata.com",
      "sentAt": "2026-06-08T11:00:00.000Z",
      "responseReceived": false,
      "responseType": "no_response",
      "nextFollowUpAt": "2026-06-12T10:00:00.000Z",
      "sequenceNumber": 1,
      "isAutomated": false
    }
  ],
  "total": 1
}
```

---

### POST /api/companies/[id]/outreach

Logs a new outreach message.

**Request Body**
```json
{
  "channel": "whatsapp",
  "messageSent": "Hola, le escribo de Kronos Data...",
  "sentBy": "alejandro@kronosdata.com",
  "responseReceived": false,
  "sequenceNumber": 2,
  "nextFollowUpAt": "2026-06-17T10:00:00.000Z",
  "isAutomated": false
}
```

**Required:** `channel` (`linkedin` | `email` | `whatsapp` | `instagram` | `call` | `other`)

**Response 201** — full outreach history record

---

## 4. Sales Note

### GET /api/companies/[id]/sales-note

Returns the current sales note for a company, or `null` if none exists.

**Response 200**
```json
{
  "id": "note-uuid",
  "companyId": "eae2e8da-...",
  "contactName": "Rosa Villanueva",
  "contactRole": "Gerente General",
  "contactPhone": "+51976543210",
  "contactEmail": null,
  "contactStatus": "attempted",
  "meetingStatus": "not_scheduled",
  "budgetMin": null,
  "budgetMax": null,
  "budgetCurrency": "USD",
  "closeProbability": 40,
  "nextAction": "Segundo intento de contacto por LinkedIn",
  "nextActionDate": "2026-06-12T10:00:00.000Z",
  "assignedTo": "alejandro@kronosdata.com",
  "createdAt": "2026-06-10T17:13:40.000Z",
  "updatedAt": "2026-06-10T17:13:40.000Z"
}
```

**Response 200** (no note exists)
```json
null
```

---

### PATCH /api/companies/[id]/sales-note

Upserts the sales note. Creates a new note if none exists; updates the existing note otherwise. All fields are optional.

**Request Body** (send only what you want to change)
```json
{
  "contactStatus": "in_conversation",
  "meetingStatus": "scheduled",
  "meetingDate": "2026-06-18T16:00:00.000Z",
  "closeProbability": 55
}
```

**Valid `contactStatus` values:** `not_contacted` | `attempted` | `contacted` | `in_conversation` | `proposal_sent` | `negotiating` | `closed_won` | `closed_lost`

**Valid `meetingStatus` values:** `not_scheduled` | `scheduled` | `completed` | `no_show` | `rescheduled`

**Response 200** (updated) or **201** (created) — full sales note object

---

## Error Reference

| Status | Meaning | When |
|--------|---------|------|
| 200 | OK | Successful GET or PUT/PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation failed — body in response |
| 404 | Not Found | Company ID does not exist |
| 500 | Internal Server Error | Database or unexpected error |

---

## Enum Reference

### country
`peru` | `mexico` | `colombia` | `chile` | `spain`

### leadSource
`google_maps` | `linkedin` | `instagram` | `facebook` | `referral` | `website` | `cold_outreach` | `event` | `other`

### status (company)
`active` | `contacted` | `client` | `archived`

### priorityLevel / priority (filter)
`hot` | `high` | `medium` | `low`

### channel (outreach)
`linkedin` | `email` | `whatsapp` | `instagram` | `call` | `other`

### responseType
`interested` | `not_interested` | `no_response` | `asked_to_follow_up` | `booked_call` | `closed_won` | `closed_lost`

### implementationDifficulty
`low` | `medium` | `high`
