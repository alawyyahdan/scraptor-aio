const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'catalog-meta.json');
const DEFAULT = { v2PlatformCount: 27, legacyCount: 5, endpointCount: 109 };

function readCatalogMeta() {
  if (!fs.existsSync(FILE)) {
    return { ...DEFAULT };
  }
  try {
    const m = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return {
      v2PlatformCount: m.v2PlatformCount ?? DEFAULT.v2PlatformCount,
      legacyCount: m.legacyCount ?? DEFAULT.legacyCount,
      endpointCount: m.endpointCount ?? DEFAULT.endpointCount,
    };
  } catch {
    return { ...DEFAULT };
  }
}

module.exports = { readCatalogMeta, CATALOG_META_FILE: FILE };
