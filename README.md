# moviLink URL Maker

Cloudflare Worker for browser and GPT Action use.

- `GET /movilink`: human-facing relay page with a direct moviLink URI and QR code.
- `POST /api/movilink`: accepts structured JSON and returns `{ "url": "..." }`.

The GPT Action schema is in [`openapi.yaml`](./openapi.yaml).

Example:

```json
{
  "name": "京都観光",
  "from": null,
  "via": [{ "lat": 34.985849, "lon": 135.758767, "name": "京都駅" }],
  "to": { "lat": 35.025413, "lon": 135.762124, "name": "京都御所" }
}
```
