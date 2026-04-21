# Romanoti Infrastructure Visualizer (RIV)

## 1. Purpose

Romanoti Infrastructure Visualizer (RIV) is a visual and operational framework designed to support managed services, data center activities, and infrastructure verification tasks.

Its purpose is to help technical teams:

- identify the correct device quickly
- execute guided operational checks
- reduce human error during field tasks
- generate consistent and professional ticket closure notes
- support future web-based demos and managed services workflows

RIV is being built as a structured Romanoti Solutions capability, not as an isolated script.

---

## 2. Current Scope

The initial version of RIV focuses on:

- verification logic
- report generation
- ticket closure text generation
- operational demos based on real support cases

The first implemented use case is based on a real-life power cycle task in a data center environment.

---

## 3. Current Project Structure

```text
romanoti-riv/
├── config/
├── demo/
├── docs/
│   └── architecture/
├── scripts/
├── src/
│   ├── api/
│   ├── core/
│   ├── engine/
│   ├── integrations/
│   ├── utils/
│   └── web/
├── tests/
├── .gitignore
└── README.md