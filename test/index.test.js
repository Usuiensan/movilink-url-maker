import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";
import { makeMapcode } from "../src/mapcode.js";
import { makePlusCode } from "../src/pluscode.js";

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

test("location codes are generated locally", () => {
  assert.equal(makePlusCode(34.985849, 135.758767), "8Q6QXQP5+8G");
  assert.equal(makeMapcode(34.985849, 135.758767), "7 526 791*92");
  assert.equal(makeMapcode(0, 0), null);
});

test("GET /movilink shows location codes and a QR code for the direct moviLink URI", async () => {
  const response = await worker.fetch(
    new Request(
      "https://go.usuiensan.dev/movilink?name=test&to=34.985849,135.758767,京都駅"
    )
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  const qrDataUri = html.match(/src="(data:image\/svg\+xml;base64,[^"]+)"/)?.[1];
  const target = html.match(/href="(https:\/\/d1vi1on7fqof1y\.cloudfront\.net\/\?[^"]+)"/)?.[1];

  assert.ok(qrDataUri);
  assert.ok(target);
  assert.match(html, /Plus Code: 8Q6QXQP5\+8G/);
  assert.match(html, /MAPCODE: 7 526 791\*92/);
  assert.doesNotMatch(html, /api\.qrserver\.com/);
  assert.match(
    Buffer.from(qrDataUri.split(",")[1], "base64").toString("utf8"),
    /^<\?xml[^>]*>\s*<svg[^>]*>/
  );
  assert.equal(
    Buffer.from(target.slice(target.indexOf("?") + 1), "base64").toString("utf8"),
    "rpn=test&dest[0]_lat=34.985849&dest[0]_lon=135.758767&dest[0]_pn=京都駅"
  );
  assert.match(html, /moviLink URIのQRコード/);
});
