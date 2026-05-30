const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");
const {
  STUDENT_SERVICE_INTERNAL,
  PROFESSOR_SERVICE_INTERNAL,
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

// Key ID — identifies which key was used to sign the token (matched against JWKS on verification)
const kid = "1";
// JWKS URL embedded in every JWT header so verifiers know where to fetch the public key
const jku = `http://localhost:${process.env.PORT}/.well-known/jwks.json`;

// Custom JWT headers: kid and jku are included so any service can verify
// the token without holding the public key locally (they fetch it via jku).
const customHeaders = {
  kid,
  jku,
};

// Signs a JWT with the RSA private key using RS256 algorithm.
// The payload should include user identity fields (e.g. id, role).
// Token expires in 1 hour; kid and jku are embedded in the header.
function generateJWTWithPrivateKey(payload) {
  const token = jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: "1h",
    header: customHeaders,
  });
  return token;
}

// Verifies a JWT using the locally loaded RSA public key.
// Used internally within authService where the public key is available on disk.
// Only used inside authService itself (other services fetch the key remotely via jku).
function verifyJWTWithPublicKey(token) {
  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
}

// Service identity token — signed with the authService private key, role AUTH_SERVICE.
// Receiving services verify it via JWKS instead of checking a shared secret.
const serviceToken = jwt.sign(
  { sub: "authService", role: ROLES.AUTH_SERVICE },
  privateKey,
  { algorithm: "RS256", header: customHeaders }
);
const internalHeaders = {
  Authorization: `Bearer ${serviceToken}`,
};

// Calls studentService internal endpoint to retrieve all students including password hashes.
// Used during login to look up the student by email and validate credentials.
async function fetchStudents() {
  const response = await axios.get(STUDENT_SERVICE_INTERNAL, { headers: internalHeaders });
  return response.data;
}

// Calls professorService internal endpoint to retrieve all professors including password hashes.
// Used during login to look up the professor by email and validate credentials.
async function fetchProfessors() {
  const response = await axios.get(PROFESSOR_SERVICE_INTERNAL, { headers: internalHeaders });
  return response.data;
}
module.exports = {
  kid,
  generateJWTWithPrivateKey,
  verifyJWTWithPublicKey,
  fetchStudents,
  fetchProfessors,
};
