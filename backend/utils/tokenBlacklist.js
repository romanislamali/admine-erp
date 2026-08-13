// In-memory store of revoked JWTs, keyed by token string, valued by expiry (unix seconds).
// Entries are pruned lazily so the map can't grow past the number of live tokens.
const revokedTokens = new Map();

const revoke = (token, expiresAt) => {
  revokedTokens.set(token, expiresAt);
};

const isRevoked = (token) => {
  const expiresAt = revokedTokens.get(token);
  if (expiresAt === undefined) return false;
  if (Date.now() / 1000 > expiresAt) {
    revokedTokens.delete(token);
    return false;
  }
  return true;
};

setInterval(() => {
  const now = Date.now() / 1000;
  for (const [token, expiresAt] of revokedTokens) {
    if (now > expiresAt) revokedTokens.delete(token);
  }
}, 60 * 60 * 1000).unref();

module.exports = { revoke, isRevoked };
