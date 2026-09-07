const CODE_ALPHABET = "23456789CFGHJMPQRVWX";
const PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125];

export function makePlusCode(latValue, lonValue) {
  let lat = Number(latValue);
  let lon = Number(lonValue);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Invalid coordinates for Plus Code");
  }

  lat = Math.min(90, Math.max(-90, lat));
  lon = normalizeLongitude(lon);

  // The north pole must be nudged into the final encodable cell.
  if (lat === 90) {
    lat -= PAIR_RESOLUTIONS.at(-1);
  }

  lat += 90;
  lon += 180;

  let code = "";

  for (const resolution of PAIR_RESOLUTIONS) {
    const latDigit = Math.floor(lat / resolution);
    const lonDigit = Math.floor(lon / resolution);

    code += CODE_ALPHABET[latDigit];
    code += CODE_ALPHABET[lonDigit];

    lat -= latDigit * resolution;
    lon -= lonDigit * resolution;
  }

  return `${code.slice(0, 8)}+${code.slice(8)}`;
}

function normalizeLongitude(lon) {
  while (lon < -180) lon += 360;
  while (lon >= 180) lon -= 360;
  return lon;
}
