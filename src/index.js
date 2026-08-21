const MOVILINK_BASE =
  "https://d1vi1on7fqof1y.cloudfront.net/?";
const PUBLIC_URL = "https://go.usuiensan.dev/movilink";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/movilink" && request.method === "POST") {
        const body = await request.json();
        return jsonResponse({ url: makePublicUrl(body) });
      }

      if (
        url.pathname !== "/movilink" ||
        (request.method !== "GET" && request.method !== "HEAD")
      ) {
        return new Response("Not Found", { status: 404 });
      }

      const route = parseQueryRoute(url.searchParams);
      return launchPageResponse(route, request.method === "HEAD");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid route";

      if (url.pathname === "/api/movilink") {
        return jsonResponse({ error: message }, 400);
      }

      return new Response(`Invalid route: ${message}`, { status: 400 });
    }
  },
};

function parseQueryRoute(searchParams) {
  const routeName = cleanName(
    searchParams.get("name") || "ChatGPT Route"
  );
  const fromRaw = searchParams.get("from");
  const viaRaw = searchParams.getAll("via");
  const toRaw = searchParams.get("to");

  if (!toRaw) {
    throw new Error('Missing "to" parameter');
  }

  const from = fromRaw ? parsePoint(fromRaw) : null;
  const vias = viaRaw.map(parsePoint);
  const to = parsePoint(toRaw);
  const points = [...vias, to];

  if (points.length > 10) {
    throw new Error("Too many destinations. Maximum is 10.");
  }

  return { name: routeName, from, points };
}

function makePublicUrl(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Request body must be an object");
  }

  if (body.via !== undefined && !Array.isArray(body.via)) {
    throw new Error('"via" must be an array');
  }

  if (body.to === undefined || body.to === null) {
    throw new Error("Missing destination");
  }

  const nameValue = body.name === undefined || body.name === null
    ? "ChatGPT Route"
    : body.name;

  if (typeof nameValue !== "string") {
    throw new Error('"name" must be a string');
  }

  const name = cleanName(nameValue);

  if (!name) {
    throw new Error("Route name is empty");
  }
  const from = body.from === undefined || body.from === null
    ? null
    : parsePointObject(body.from);
  const vias = (body.via || []).map(parsePointObject);
  const to = parsePointObject(body.to);
  const points = [...vias, to];

  if (points.length > 10) {
    throw new Error("Too many destinations. Maximum is 10.");
  }

  const publicUrl = new URL(PUBLIC_URL);
  publicUrl.searchParams.set("name", name);

  if (from) {
    publicUrl.searchParams.set(
      "from",
      `${from.lat},${from.lon},${from.name}`
    );
  }

  for (const point of vias) {
    publicUrl.searchParams.append(
      "via",
      `${point.lat},${point.lon},${point.name}`
    );
  }

  publicUrl.searchParams.set(
    "to",
    `${to.lat},${to.lon},${to.name}`
  );

  return publicUrl.toString();
}

function makeMovilinkUrl({ name, from, points }) {
  const parts = [`rpn=${name}`];

  if (from) {
    parts.push(`dep_lat=${from.lat}`);
    parts.push(`dep_lon=${from.lon}`);
    parts.push(`dep_pn=${from.name}`);
  }

  points.forEach((point, i) => {
    parts.push(`dest[${i}]_lat=${point.lat}`);
    parts.push(`dest[${i}]_lon=${point.lon}`);
    parts.push(`dest[${i}]_pn=${point.name}`);
  });

  const base64 = utf8ToBase64(parts.join("&"));
  return MOVILINK_BASE + base64;
}

function launchPageResponse(route, headOnly = false) {
  const target = makeMovilinkUrl(route);
  const routeName = escapeHtml(route.name);
  const departure = route.from
    ? escapeHtml(route.from.name)
    : "現在地";
  const pointItems = route.points
    .map((point, index) => {
      const label = index === route.points.length - 1 ? "目的地" : `経由地 ${index + 1}`;
      return `<li><span>${label}</span><strong>${escapeHtml(point.name)}</strong></li>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>moviLinkでルートを開く</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 24px; background: Canvas; color: CanvasText; }
    main { max-width: 560px; margin: 0 auto; }
    h1 { font-size: 1.4rem; margin: 0 0 8px; }
    .route-name { margin: 0 0 20px; opacity: .8; }
    .route { margin: 0 0 24px; padding: 0; list-style: none; }
    .route li { display: grid; grid-template-columns: 5.5rem 1fr; gap: 8px; padding: 10px 0; border-bottom: 1px solid color-mix(in srgb, CanvasText 18%, transparent); }
    .route span { opacity: .65; }
    .qr { display: block; width: min(240px, 100%); height: auto; margin: 24px auto; background: white; }
    .open { display: block; padding: 14px 18px; border-radius: 10px; text-align: center; text-decoration: none; font-weight: 700; background: ButtonFace; color: ButtonText; border: 1px solid color-mix(in srgb, CanvasText 30%, transparent); }
    .note { margin-top: 16px; font-size: .9rem; opacity: .7; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>moviLinkでルートを開く</h1>
    <p class="route-name">${routeName}</p>
    <ul class="route">
      <li><span>出発地</span><strong>${departure}</strong></li>
      ${pointItems}
    </ul>
    <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(target)}" alt="moviLink URIのQRコード" width="240" height="240" referrerpolicy="no-referrer">
    <a class="open" href="${escapeHtml(target)}">moviLinkで開く</a>
    <p class="note">QRコードを読み取ると、moviLinkのBase64 URIをそのまま開けます。moviLinkがインストールされた端末で利用してください。</p>
  </main>
</body>
</html>`;

  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; img-src https://api.qrserver.com; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };

  return new Response(headOnly ? null : html, { status: 200, headers });
}

function parsePoint(value) {
  const fields = value.split(",");

  if (fields.length < 3) {
    throw new Error(
      `Point must be latitude,longitude,name: ${value}`
    );
  }

  const lat = Number(fields.shift());
  const lon = Number(fields.shift());
  return validatePoint(lat, lon, fields.join(","));
}

function parsePointObject(point) {
  if (!point || typeof point !== "object" || Array.isArray(point)) {
    throw new Error("Invalid point");
  }

  if (point.lat === undefined || point.lon === undefined) {
    throw new Error("Point must include lat and lon");
  }

  return validatePoint(point.lat, point.lon, point.name);
}

function validatePoint(latValue, lonValue, nameValue) {
  const lat = Number(latValue);
  const lon = Number(lonValue);

  if (typeof nameValue !== "string" || !nameValue.trim()) {
    throw new Error("Point name is empty");
  }

  const name = cleanName(nameValue);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}`);
  }

  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error(`Invalid longitude: ${lon}`);
  }

  return { lat: String(lat), lon: String(lon), name };
}

function cleanName(value) {
  return String(value)
    .trim()
    .replaceAll("&", "＆")
    .replaceAll("=", "＝");
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
