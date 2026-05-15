// Convert camelCase Prisma object keys to snake_case for frontend compatibility
function toSnake(str) {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function normalize(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    out[toSnake(key)] = val;
  }
  return out;
}

function normalizeMany(rows) {
  return rows.map(normalize);
}

module.exports = { normalize, normalizeMany };
