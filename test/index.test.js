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

test("GET /movilink shows a QR code for the direct moviLink URI", async () => {
  const response = await worker.fetch(
    new Request(
      "https://go.usuiensan.dev/movilink?name=test&to=35.1,135.7,京都"
    )
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  const qrUrl = html.match(/src="([^"]*api\.qrserver\.com[^"]*)"/)?.[1];
  const target = html.match(/href="(https:\/\/d1vi1on7fqof1y\.cloudfront\.net\/\?[^"]+)"/)?.[1];

  assert.ok(qrUrl);
  assert.ok(target);
  assert.equal(new URL(qrUrl).searchParams.get("data"), target);
  assert.equal(
    Buffer.from(target.slice(target.indexOf("?") + 1), "base64").toString("utf8"),
    "rpn=test&dest[0]_lat=35.1&dest[0]_lon=135.7&dest[0]_pn=京都"
  );
  assert.match(html, /moviLink URIのQRコード/);
});
