const MOVILINK_BASE =
  "https://d1vi1on7fqof1y.cloudfront.net/?";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== "/movilink") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const routeName = cleanName(
        url.searchParams.get("name") || "ChatGPT Route"
      );

      const fromRaw = url.searchParams.get("from");
      const viaRaw = url.searchParams.getAll("via");
      const toRaw = url.searchParams.get("to");

      if (!toRaw) {
        return new Response(
          'Missing "to" parameter',
          { status: 400 }
        );
      }

      const from = fromRaw ? parsePoint(fromRaw) : null;
      const vias = viaRaw.map(parsePoint);
      const to = parsePoint(toRaw);

      const points = [...vias, to];

      if (points.length > 10) {
        return new Response(
          "Too many destinations. Maximum is 10.",
          { status: 400 }
        );
      }

      const parts = [`rpn=${routeName}`];

      // from省略時はmoviLink側で現在地出発
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

      const payload = parts.join("&");
      const base64 = utf8ToBase64(payload);

      // moviLinkへ渡すクエリはBase64だけにする
      const target =
        MOVILINK_BASE + encodeURIComponent(base64);

      return Response.redirect(target, 302);
    } catch (error) {
      return new Response(
        `Invalid route: ${error.message}`,
        { status: 400 }
      );
    }
  },
};

function parsePoint(value) {
  const fields = value.split(",");

  if (fields.length < 3) {
    throw new Error(
      `Point must be latitude,longitude,name: ${value}`
    );
  }

  const lat = Number(fields.shift());
  const lon = Number(fields.shift());
  const name = cleanName(fields.join(","));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}`);
  }

  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error(`Invalid longitude: ${lon}`);
  }

  if (!name) {
    throw new Error("Point name is empty");
  }

  return {
    lat: String(lat),
    lon: String(lon),
    name,
  };
}

function cleanName(value) {
  return String(value)
    .trim()
    // moviLink側が & と = で単純分割するため
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