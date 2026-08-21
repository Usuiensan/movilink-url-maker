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

      if (url.pathname !== "/movilink" || request.method !== "GET") {
        return new Response("Not Found", { status: 404 });
      }

      const route = parseQueryRoute(url.searchParams);
      return Response.redirect(makeMovilinkUrl(route), 302);
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
  return MOVILINK_BASE + encodeURIComponent(base64);
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
