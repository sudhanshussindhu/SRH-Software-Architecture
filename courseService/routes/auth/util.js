const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
const { getCorrelationId } = require("../../../correlationId");
const { courseServiceLogger } = require("../../../logging");
const jwkToPem = require("jwk-to-pem");
const { ROLES } = require("../../../consts");

dotenv.config();

// Trusted domains to prevent SSRF
const trustedDomains = ["http://localhost:"];

const axiosInstance = axios.create();

axiosInstance.interceptors.request.use((config) => {
  try {
    const cid = getCorrelationId();
    if (cid) config.headers["x-correlation-id"] = cid;
    courseServiceLogger.debug(`Outgoing request ${config.method} ${config.url} - cid:${cid}`);
  } catch (e) {}
  return config;
});
axiosInstance.interceptors.response.use((r) => r, (err) => {
  try { courseServiceLogger.error(`Outgoing request failed: ${err && err.message} - cid:${getCorrelationId()}`); } catch (e) {}
  return Promise.reject(err);
});

async function fetchJWKS(jku) {
  const response = await axiosInstance.get(jku);
  return response.data.keys;
}

function getPublicKeyFromJWKS(kid, keys) {
  const key = keys.find((k) => k.kid === kid);

  if (!key) {
    throw new Error("Unable to find a signing key that matches the 'kid'");
  }

  return jwkToPem(key);
}

async function verifyJWTWithJWKS(token) {
  const decodedHeader = jwt.decode(token, { complete: true }).header;
  const { kid, alg, jku } = decodedHeader;

  if (!kid || !jku) {
    throw new Error("JWT header is missing 'kid' or 'jku'");
  }

  if (alg !== "RS256") {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }

  if (!trustedDomains.some((domain) => jku.startsWith(domain))) {
    throw new Error("Domain not supported / untrusted JKU");
  }

  const keys = await fetchJWKS(jku);
  const publicKey = getPublicKeyFromJWKS(kid, keys);

  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
}

// Role-based Access Control Middleware
function verifyRole(requiredRoles) {
  return async (req, res, next) => {
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authorization token is missing" });
    }

    try {
      const decoded = await verifyJWTWithJWKS(token);
      req.user = decoded;

      const userRoles = req.user.roles || [];
      const hasRequiredRole = userRoles.some((role) => requiredRoles.includes(role));
      if (hasRequiredRole) {
        return next();
      } else {
        return res.status(403).json({ message: "Access forbidden: Insufficient role" });
      }
    } catch (error) {
      console.error(error);
      return res.status(403).json({ message: "Invalid or expired token", error: error.message });
    }
  };
}

function restrictProfessorToOwnData(req, res, next) {
  if (
    req.user.roles.includes(ROLES.PROFESSOR) &&
    req.user.id !== req.params.id
  ) {
    return res.status(403).json({
      message: "Access forbidden: You can only access your own data",
    });
  }
  next();
}

async function restrictCourseToCreator(req, res, next) {
  if (req.user.roles.includes(ROLES.ADMIN)) {
    return next();
  }
  try {
    const Course = require("../../models/course");
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.createdBy !== req.user.id) {
      return res.status(403).json({
        message: "Access forbidden: You can only modify courses you created",
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  verifyRole,
  restrictProfessorToOwnData,
  restrictCourseToCreator,
};


