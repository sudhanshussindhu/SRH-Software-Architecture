const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
const { ROLES, AUTH_SERVICE, ENROLLMENT_SERVICE } = require("../../../consts");

dotenv.config();

const trustedDomain = [AUTH_SERVICE.split("api")[0], ENROLLMENT_SERVICE.split("api")[0]];

/**
 * Fetch the JWKS from a given URI.
 * @param {string} jku - The JWKS URI from the JWT header.
 * @returns {Promise<Array>} - A promise that resolves to the JWKS keys.
 */
async function fetchJWKS(jku) {
  const response = await axios.get(jku);
  return response.data.keys;
}

/**
 * Get the public key from JWKS.
 * @param {string} kid - The key ID from the JWT header.
 * @param {Array} keys - The JWKS keys.
 * @returns {string} - The corresponding public key in PEM format.
 */
function getPublicKeyFromJWKS(kid, keys) {
  const key = keys.find((k) => k.kid === kid);

  if (!key) {
    throw new Error("Unable to find a signing key that matches the 'kid'");
  }

  return `-----BEGIN PUBLIC KEY-----\n${key.n}\n-----END PUBLIC KEY-----`;
}

/**
 * Verify a JWT token using the JWKS URI in the `jku` header.
 * @param {string} token - The JWT token to verify.
 * @returns {Promise<object>} - A promise that resolves to the decoded JWT payload.
 */
async function verifyJWTWithJWKS(token) {
  const decodedHeader = jwt.decode(token, { complete: true }).header;
  const { kid, alg, jku } = decodedHeader;

  if (!kid || !jku) {
    throw new Error("JWT header is missing 'kid' or 'jku'");
  }

  if (alg !== "RS256") {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }

  if (!trustedDomain.some((domain) => jku.startsWith(domain))) {
    throw new Error("Untrusted JWKS URL");
  }

  const keys = await fetchJWKS(jku);
  const publicKey = getPublicKeyFromJWKS(kid, keys);

  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
}

// Role-based Access Control Middleware
function verifyRole(requiredRoles) {
  return async (req, res, next) => {
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1]; // Extract token from 'Bearer <token>'

    if (!token) {
      return res
        .status(401)
        .json({ message: "Authorization token is missing" });
    }

    try {
      // Step 1: Verify the JWT token using JWKS
      const decoded = await verifyJWTWithJWKS(token); // Decode the token and get the payload
      req.user = decoded; // Attach the decoded payload (user data) to the request object

      // Step 2: Check if the user's role is in the required roles list
      // JWT payload uses singular `role` string (set by authService)
      const hasRequiredRole = requiredRoles.includes(req.user.role);
      if (hasRequiredRole) {
        return next();
      } else {
        return res
          .status(403)
          .json({ message: "Access forbidden: Insufficient role" });
      }
    } catch (error) {
      console.error(error);
      return res
        .status(403)
        .json({ message: "Invalid or expired token", error: error.message });
    }
  };
}

function restrictProfessorToOwnData(req, res, next) {
  if (
    req.user.role === ROLES.PROFESSOR &&
    req.user.sub !== req.params.id
  ) {
    return res.status(403).json({
      message: "Access forbidden: You can only access your own data",
    });
  }
  next();
}

async function restrictCourseToCreator(req, res, next) {
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }
  try {
    const Course = require("../../models/course");
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.createdBy !== req.user.sub) {
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
