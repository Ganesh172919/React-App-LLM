---
title: "<Resource> API guide"
description: "How to authenticate and use the <resource> endpoints"
quadrant: reference
audience: [api-consumer]
owner: "@<team>"
status: reviewed
last_reviewed: YYYY-MM-DD
review_every_days: 90
---

# <Resource> API

Base URL: `https://api.example.com/v1`
Authentication: <scheme and header>. See [authentication](authentication.md).

## <METHOD> /<path>

**Operation ID:** `<operationId>` | **Stability:** stable | **Rate limit:** <value> | **Idempotent:** yes/no

| Parameter | In | Type | Required | Constraints | Description |
|---|---|---|---|---|---|

Request example:

```bash
curl --fail --request POST "https://api.example.com/v1/<path>" \
  --header "Authorization: Bearer <token>" \
  --header "Content-Type: application/json" \
  --data '{"example": "value"}'
```

Response `200`:

```json
{ "id": "example" }
```

Errors: see [error catalog](errors.md). Applicable codes: `<CODE_1>`, `<CODE_2>`.
