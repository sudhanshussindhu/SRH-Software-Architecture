const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");
const { getCorrelationId } = require("../../../correlationId");
const { authServiceLogger } = require("../../../logging");
const {
  STUDENT_SERVICE,
  PROFESSOR__SERVICE,
  ROLES,
} = require("../../../consts");

dotenv.config();

// Path to your private and public keys
const privateKey = fs.readFileSync(
  path.join(__dirname, "../auth/keys/private.key"),
  "utf8"
);
const publicKey = fs.readFileSync(
  path.join(__dirname, "../auth/keys/public.key"),
  "utf8"
);

const kid = "1";
const jku = `http://localhost:${process.env.PORT}/.well-known/jwks.json`;

// Define additional headers
const customHeaders = {
  kid,
  jku,
};

// Generate a JWT using the private key
function generateJWTWithPrivateKey(payload) {
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: "1h",
    header: customHeaders,
  });
}

// JWT verification function
function verifyJWTWithPublicKey(token) {
  try {
    return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
  } catch (err) {
    throw new Error("Invalid token");
  }
}

// Axios instance with correlation ID interceptors
const trustedDomain = ["http://localhost:"];
const axiosInstance = axios.create();
axiosInstance.interceptors.request.use((config) => {
  try {
    const cid = getCorrelationId();
    if (cid) config.headers["x-correlation-id"] = cid;
    authServiceLogger.debug(`Outgoing request ${config.method} ${config.url} - cid:${cid}`);
  } catch (e) {}
  return config;
});
axiosInstance.interceptors.response.use((r) => r, (err) => {
  try { authServiceLogger.error(`Outgoing request failed: ${err && err.message} - cid:${getCorrelationId()}`); } catch (e) {}
  return Promise.reject(err);
});

async function fetchJWKS(jku) {
  const res = await axiosInstance.get(jku);
  return res.data.keys;
}
function getPublicKeyFromJWKS(kid, keys) {
  const key = keys.find((k) => k.kid === kid);
  if (!key) throw new Error("Key not found in JWKS");
  return `-----BEGIN PUBLIC KEY-----\n${key.x5c[0]}\n-----END PUBLIC KEY-----`;
}
async function verifyJWTWithJWKS(token) {
  const decodedHeader = jwt.decode(token, { complete: true }).header;
  const { kid, alg, jku } = decodedHeader;

  if (!kid || !jku) {
    throw new Error("JWT header is missing 'kid' or 'jku'");
  }

  if (!trustedDomain.some((domain) => jku.startsWith(domain))) {
    throw new Error("Domain not supported");
  }

  if (alg !== "RS256") {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }

  const keys = await fetchJWKS(jku);
  const publicKey = getPublicKeyFromJWKS(kid, keys);

  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
}

async function fetchStudents() {
  const token = generateJWTWithPrivateKey({
    id: ROLES.AUTH_SERVICE,
    roles: [ROLES.AUTH_SERVICE],
  });
  const response = await axiosInstance.get(STUDENT_SERVICE, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function fetchProfessors() {
  const token = generateJWTWithPrivateKey({
    id: ROLES.AUTH_SERVICE,
    roles: [ROLES.AUTH_SERVICE],
  });
  const response = await axiosInstance.get(PROFESSOR__SERVICE, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

function verifyRole(requiredRole) {
  return (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "authorization token missing" });
    }
    try {
      const decoded = verifyJWTWithPublicKey(token);
      if (!decoded.role || decoded.role !== requiredRole) {
        return res.status(403).json({ message: "forbidden: insufficient role" });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: "invalid or expired token" });
    }
  };
}

module.exports = {
  kid,
  generateJWTWithPrivateKey,
  verifyJWTWithPublicKey,
  verifyJWTWithJWKS,
  fetchStudents,
  fetchProfessors,
  verifyRole,
};

dotenv.config();

// Load RSA key pair from disk
const RSA_PRIVATE_KEY = fs.readFileSync(path.join(__dirname, "../auth/keys/private.key"), "utf8");
const RSA_PUBLIC_KEY = fs.readFileSync(path.join(__dirname, "../auth/keys/public.key"), "utf8");

// Key metadata embedded in every JWT header
const KEY_ID = "1";
const JWKS_URL = `http://localhost:${process.env.PORT}/.well-known/jwks.json`;

const jwtHeader = {
  kid: KEY_ID,
  jku: JWKS_URL,
};

// Allowed jku origins — prevents SSRF by rejecting tokens pointing to external JWKS
const ALLOWED_ORIGINS = ["http://localhost:"];

// Creates a signed RS256 JWT with kid/jku embedded in the header
function signToken(payload) {
  return jwt.sign(payload, RSA_PRIVATE_KEY, {
    algorithm: "RS256",
    expiresIn: "1h",
    header: jwtHeader,
  });
}

// Verifies a token using the local public key (only used within authService)
function verifyLocalToken(token) {
  try {
    return jwt.verify(token, RSA_PUBLIC_KEY, { algorithms: ["RS256"] });
  } catch (err) {
    throw new Error("Invalid token");
  }
}

// Axios client that automatically forwards the correlation ID on every outgoing call
const httpClient = axios.create();

httpClient.interceptors.request.use((config) => {
  try {
    const correlationId = getCorrelationId();
    if (correlationId) config.headers["x-correlation-id"] = correlationId;
    authServiceLogger.debug(`[auth-util] → ${config.method?.toUpperCase()} ${config.url} cid:${correlationId}`);
  } catch (_) {}
  return config;
});

httpClient.interceptors.response.use(
  (res) => res,
  (err) => {
    try {
      authServiceLogger.error(`[auth-util] request failed: ${err?.message} cid:${getCorrelationId()}`);
    } catch (_) {}
    return Promise.reject(err);
  }
);

// ── JWKS-based remote verification ──────────────────────────────────────────

async function loadRemoteKeys(jwksUrl) {
  const { data } = await httpClient.get(jwksUrl);
  return data.keys;
}

function extractPublicKeyFromJWKS(keyId, keys) {
  const match = keys.find((k) => k.kid === keyId);
  if (!match) throw new Error(`No matching key found for kid: ${keyId}`);
  return `-----BEGIN PUBLIC KEY-----\n${match.x5c[0]}\n-----END PUBLIC KEY-----`;
}

async function verifyJWTWithJWKS(token) {
  const { header } = jwt.decode(token, { complete: true });
  const { kid, jku, alg } = header;

  if (!kid || !jku) throw new Error("Token header must include kid and jku");

  const isTrusted = ALLOWED_ORIGINS.some((origin) => jku.startsWith(origin));
  if (!isTrusted) throw new Error("jku points to an untrusted domain");

  if (alg !== "RS256") throw new Error(`Algorithm ${alg} is not supported`);

  const keys = await loadRemoteKeys(jku);
  const pubKey = extractPublicKeyFromJWKS(kid, keys);

  return jwt.verify(token, pubKey, { algorithms: ["RS256"] });
}

// ── Service-to-service calls ────────────────────────────────────────────────

// Generates a short-lived service identity token for each outbound request
function buildServiceToken() {
  return signToken({ id: ROLES.AUTH_SERVICE, roles: [ROLES.AUTH_SERVICE] });
}

async function fetchStudents() {
  const headers = { Authorization: `Bearer ${buildServiceToken()}` };
  const { data } = await httpClient.get(STUDENT_SERVICE, { headers });
  return data;
}

async function fetchProfessors() {
  const headers = { Authorization: `Bearer ${buildServiceToken()}` };
  const { data } = await httpClient.get(PROFESSOR__SERVICE, { headers });
  return data;
}

// ── Role-based access middleware ─────────────────────────────────────────────

function requireRole(role) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Authorization token missing" });

    try {
      const decoded = verifyLocalToken(token);
      if (!decoded.role || decoded.role !== role) {
        return res.status(403).json({ message: "Access denied: insufficient role" });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Token is invalid or expired" });
    }
  };
}

module.exports = {
  kid: KEY_ID,
  generateJWTWithPrivateKey: signToken,
  verifyJWTWithPublicKey: verifyLocalToken,
  verifyJWTWithJWKS,
  fetchStudents,
  fetchProfessors,
  verifyRole: requireRole,
};
