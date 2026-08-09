# Personal Brain — Software Design Specification

## 1. Problem

People store information across multiple personal tools such as
Gmail and Google Drive.

Finding information across these sources requires manually searching
each service and mentally correlating the results.

The Personal Brain provides a conversational interface that retrieves
information from connected personal sources and produces a grounded
answer using evidence from multiple sources.

---

## 2. Goal

Build a working conversational Personal Brain that:

1. Connects to at least two personal data sources.
2. Ingests information from those sources.
3. Stores normalized knowledge in GBrain.
4. Supports natural-language queries.
5. Performs cross-source reasoning.
6. Grounds responses in retrieved evidence.
7. Clearly identifies sources used in an answer.
8. Avoids fabricating information when evidence is unavailable.

---

## 3. Initial Connectors

Version 1 supports:

- Gmail
- Google Drive

Future connectors may include:

- Slack
- Notion
- Google Calendar

---

## 4. Example Queries

### Tier 1

The system should support:

- "Find the email from Stripe about the failed payment."
- "Show me my recent emails about interviews."
- "Find the documents related to my job applications."

### Tier 2

The system should support:

- "What jobs have I applied to and what is my current status?"
- "Did I send the contract draft to Priya and did she reply?"
- "Find the job application email and the corresponding resume/document."

The Tier 2 queries must require evidence from more than one source.

---

## 5. Functional Requirements

### FR-01 — Google OAuth

The application must authenticate the user's Google account
using OAuth 2.0.

### FR-02 — Gmail Access

The application must be able to retrieve authorized Gmail messages.

### FR-03 — Google Drive Access

The application must be able to retrieve authorized Google Drive files.

### FR-04 — Data Ingestion

Retrieved source data must be normalized into a common document model.

### FR-05 — GBrain Storage

Normalized documents must be stored in GBrain.

### FR-06 — Retrieval

The system must retrieve relevant evidence for a natural-language query.

### FR-07 — Cross-source Retrieval

A query may retrieve evidence from Gmail and Drive simultaneously.

### FR-08 — Reasoning

The system must synthesize retrieved evidence into a conversational answer.

### FR-09 — Grounding

The model must only make factual claims supported by retrieved evidence.

### FR-10 — Unknown Handling

If sufficient evidence cannot be found, the system must explicitly say
that it could not find enough information.

### FR-11 — Source Attribution

Responses must identify the source of important evidence.

### FR-12 — Chat Interface

The user must be able to submit natural-language queries through a UI.

---

## 6. Non-Functional Requirements

### NFR-01 — Security

OAuth credentials and access tokens must never be committed to Git.

### NFR-02 — Privacy

Only data explicitly authorized by the user may be retrieved.

### NFR-03 — Reliability

External API failures must not crash the application.

### NFR-04 — Observability

Important connector and reasoning operations should be logged.

### NFR-05 — Testability

Core services should be independently testable.

### NFR-06 — Deployment

The application should be deployable using free/low-cost hosting
where practical.

---

## 7. Architecture

```text
React UI
   |
   v
API Server
   |
   +---- Google OAuth
   |
   +---- Gmail Connector
   |
   +---- Drive Connector
   |
   +---- Ingestion Pipeline
   |
   +---- GBrain
   |
   +---- Retrieval / Agent
   |
   v
  LLM