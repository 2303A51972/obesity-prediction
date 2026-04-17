const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const isPlaceholder = clientId.includes("YOUR_GOOGLE_CLIENT_ID");
  return isPlaceholder ? "" : clientId;
}

function getGoogleClientSecret() {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const isPlaceholder = clientSecret.includes("YOUR_GOOGLE_CLIENT_SECRET");
  return isPlaceholder ? "" : clientSecret;
}

function getGoogleRedirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }

  const protocol = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}/api/auth/google/callback`;
}

function getFrontendUrl(req) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  const protocol = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}`;
}

function createGoogleClient(req) {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getGoogleRedirectUri(req);

  if (!clientId || !clientSecret) {
    return null;
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "secret", {
    expiresIn: "1h",
  });
}

router.get("/google-config", (req, res) => {
  const clientId = getGoogleClientId();
  res.json({
    configured: Boolean(clientId),
    clientId,
  });
});

router.get("/google/start", (req, res) => {
  const googleClient = createGoogleClient(req);

  if (!googleClient) {
    return res.redirect(`${getFrontendUrl(req)}/login.html?error=google_not_configured`);
  }

  const authUrl = googleClient.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    redirect_uri: getGoogleRedirectUri(req),
  });

  return res.redirect(authUrl);
});

router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.redirect(`${getFrontendUrl(req)}/login.html?error=missing_code`);
    }

    const googleClient = createGoogleClient(req);
    if (!googleClient) {
      return res.redirect(`${getFrontendUrl(req)}/login.html?error=google_not_configured`);
    }

    const { tokens } = await googleClient.getToken(code);
    if (!tokens.id_token) {
      return res.redirect(`${getFrontendUrl(req)}/login.html?error=missing_id_token`);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: getGoogleClientId(),
    });

    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) {
      return res.redirect(`${getFrontendUrl(req)}/login.html?error=google_email_missing`);
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        password: null,
        authProvider: "google",
      });
      await user.save();
    } else if (!user.authProvider) {
      user.authProvider = "google";
      if (!user.password) {
        user.password = null;
      }
      await user.save();
    }

    const token = signToken(user._id);
    return res.redirect(`${getFrontendUrl(req)}/dashboard.html?token=${encodeURIComponent(token)}`);
  } catch (err) {
    return res.redirect(`${getFrontendUrl(req)}/login.html?error=google_callback_failed`);
  }
});

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    // check if user exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    user = new User({ email, password: hashed, authProvider: "local" });
    await user.save();

    res.json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    if (user.authProvider === "google" || !user.password) {
      return res.status(400).json({ msg: "Use Google Sign-In for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid password" });

    const token = signToken(user._id);

    res.json({ token, msg: "Login successful" });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;