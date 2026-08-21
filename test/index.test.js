import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

test("POST /api/movilink returns a usable public URL", async () => {
  const response = await worker.fetch(
    new Request("https://go.usuiensan.dev/api/movilink", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "京都観光",
        from: null,
        via: [{ lat: 34.985849, lon: 135.758767, name: "京都駅" }],
        to: { lat: 35.025413, lon: 135.762124, name: "京都御所" },
      }),
    })
  );

  assert.equal(response.status, 200);
  const result = await response.json();
  const url = new URL(result.url);
  assert.equal(url.origin, "https://go.usuiensan.dev");
  assert.equal(url.pathname, "/movilink");
  assert.equal(url.searchParams.get("name"), "京都観光");
  assert.equal(url.searchParams.get("via"), "34.985849,135.758767,京都駅");
  assert.equal(url.searchParams.get("to"), "35.025413,135.762124,京都御所");
});

test("POST /api/movilink rejects invalid points", async () => {
  const response = await worker.fetch(
    new Request("https://go.usuiensan.dev/api/movilink", {
      method: "POST",
      body: JSON.stringify({
        name: "test",
        to: { lat: 91, lon: 135, name: "目的地" },
      }),
    })
  );

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Invalid latitude/);
});

test("GET /movilink keeps the redirect flow", async () => {
  const response = await worker.fetch(
    new Request(
      "https://go.usuiensan.dev/movilink?name=test&to=35.1,135.7,京都"
    )
  );

  assert.equal(response.status, 302);
  assert.match(response.headers.get("location"), /^https:\/\/d1vi1on7fqof1y\.cloudfront\.net\/\?/);
});
