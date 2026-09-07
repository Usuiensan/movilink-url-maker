import ZoneCoords from "./mapcode-zone-coords.js";

export function makeMapcode(latValue, lonValue) {
  const lat = Number(latValue);
  const lon = Number(lonValue);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Invalid coordinates for MAPCODE");
  }

  const zone = findZone(lat, lon);
  if (zone === null) return null;

  const [fromLat, fromLon, toLat, toLon] = ZoneCoords[zone];
  const { block, unit, core } = encodeWithinZone(
    fromLat,
    fromLon,
    toLat,
    toLon,
    lat,
    lon
  );

  if (zone === 0) {
    if (block === 0) {
      if (unit === 0) return `*${pad(core, 2)}`;
      return `${unit}*${pad(core, 2)}`;
    }
    return `${block} ${pad(unit, 3)}*${pad(core, 2)}`;
  }

  return `${zone} ${pad(block, 3)} ${pad(unit, 3)}*${pad(core, 2)}`;
}

function findZone(lat, lon) {
  for (const zone of Object.keys(ZoneCoords)) {
    const [fromLat, fromLon, toLat, toLon] = ZoneCoords[zone];
    if (
      lat >= fromLat &&
      lat < toLat &&
      lon >= fromLon &&
      lon < toLon
    ) {
      return Number(zone);
    }
  }
  return null;
}

function encodeWithinZone(fromLat, fromLon, toLat, toLon, lat, lon) {
  const height = toLat - fromLat;
  const width = toLon - fromLon;

  const xBlock = Math.floor(((lon - fromLon) / width) * 30);
  const yBlock = Math.floor(((lat - fromLat) / height) * 30);
  const block = yBlock * 30 + xBlock;

  const blockHeight = height / 30;
  const blockWidth = width / 30;
  const blockStartLat = fromLat + yBlock * blockHeight;
  const blockStartLon = fromLon + xBlock * blockWidth;

  const xUnit = Math.floor(((lon - blockStartLon) / blockWidth) * 30);
  const yUnit = Math.floor(((lat - blockStartLat) / blockHeight) * 30);
  const unit = (yUnit % 30) * 30 + (xUnit % 30);

  const unitHeight = height / 900;
  const unitWidth = width / 900;
  const unitStartLat = blockStartLat + yUnit * unitHeight;
  const unitStartLon = blockStartLon + xUnit * unitWidth;

  const xCore = Math.floor(((lon - unitStartLon) / unitWidth) * 10);
  const yCore = Math.floor(((lat - unitStartLat) / unitHeight) * 10);
  const core = (yCore % 10) * 10 + (xCore % 10);

  return { block, unit, core };
}

function pad(value, length) {
  return String(value).padStart(length, "0");
}
