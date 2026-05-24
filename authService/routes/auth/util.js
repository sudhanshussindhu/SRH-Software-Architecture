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
function verifyJWTWithPublicKey(token) {
  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
}

// Internal headers sent with every service-to-service request.
// The receiving service validates this secret to reject requests from outside.
const internalHeaders = {
  "x-internal-secret": process.env.INTERNAL_SERVICE_SECRET,
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
