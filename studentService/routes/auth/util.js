const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
const { ROLES, AUTH_SERVICE, ENROLLMENT_SERVICE } = require("../../../consts");

dotenv.config();

const trustedDomain = [AUTH_SERVICE.split("api")[0], ENROLLMENT_SERVICE.split("api")[0]];

// Fetches the JSON Web Key Set (JWKS) from the authService's well-known endpoint.
// The JWKS contains the public key(s) used to verify JWT signatures.
async function fetchJWKS(jku) {
  const response = await axios.get(jku);
  return response.data.keys; 
}

// Finds the matching public key in the JWKS by Key ID (kid) and reconstructs
// it as a PEM-formatted string that jsonwebtoken can use for verification.
function getPublicKeyFromJWKS(kid, keys) {
  const key = keys.find((k) => k.kid === kid);

  if (!key) {
    throw new Error("Unable to find a signing key that matches the 'kid'");
  }

  return `-----BEGIN PUBLIC KEY-----\n${key.n}\n-----END PUBLIC KEY-----`;
}

// Verifies a JWT without needing the public key locally.
// Steps:
//   1. Decode the token header to extract kid (key ID) and jku (JWKS URL).
//   2. Fetch the JWKS from the authService using the jku URL.
//   3. Find the matching public key by kid.
//   4. Verify the token signature using RS256 algorithm.

async function verifyJWTWithJWKS(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header) {
    throw new Error("Invalid token");
  }
  const { kid, jku } = decoded.header;


  if (!trustedDomain.some((domain) => jku.startsWith(domain))) {
    throw new Error("Untrusted JWKS URL");
  }

  const keys = await fetchJWKS(jku);
  const publicKey = getPublicKeyFromJWKS(kid, keys);
  
  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
}

// Role-based Access Control (RBAC) middleware factory.
// Usage: router.get('/route', verifyRole([ROLES.ADMIN, ROLES.PROFESSOR]), handler)
// Steps:
//   1. Extract the Bearer token from the Authorization header.
//   2. Verify the token via JWKS and decode the payload.
//   3. Check if the token's role is in the requiredRoles list.
//   4. Attach the decoded payload to req.user for downstream handlers.
function verifyRole(requiredRoles) {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1]; // Extract the token part after "Bearer " Authorization: Bearer eyJhbGc... //  split(" ")[1] takes this part
    try {
      const payload = await verifyJWTWithJWKS(token);
      if (!requiredRoles.includes(payload.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient role" });
      }
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}

// Middleware to ensure a student can only access their own data.
// Compares the authenticated user's ID (from the token) with the :id route param.
// Admins and professors are not restricted by this middleware.
function restrictStudentToOwnData(req, res, next) {
  if (req.user.role === ROLES.STUDENT && req.user.sub !== req.params.id) {
    return res.status(403).json({ message: "Forbidden: access to own data only" });
  }
  next();
}

module.exports = {
  verifyRole,
  verifyJWTWithJWKS,
  restrictStudentToOwnData,
};
