const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { kid } = require("./util");

const publicKey = fs.readFileSync(
  path.join(__dirname, "../auth/keys/public.key"),
  "utf8"
);

router.get("/", (req, res) => {
  try {
    const jwk = crypto.createPublicKey(publicKey).export({ format: "jwk" });
    const publicJWK = {
      keys: [
        {
          kty: jwk.kty,
          kid,
          use: "sig",
          alg: "RS256",
          n: jwk.n,
          e: jwk.e,
        },
      ],
    };
    res.json(publicJWK);
  } catch (error) {
    console.error("Error generating JWK:", error);
    res.status(500).json({ message: "Server error generating JWK" });
  }
});

module.exports = router;
