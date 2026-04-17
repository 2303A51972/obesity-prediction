const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ msg: "Unauthorized: token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ msg: "Unauthorized: invalid token" });
  }
}

// Dashboard stats
router.get("/stats", requireAuth, (req, res) => {
  res.json({
    totalPatients: 860510,
    obesityRate: "17.03%",
    auc: "81%",
    recall: "97.63%"
  });
});

// 🔥 Prediction API
router.post("/predict", requireAuth, (req, res) => {
  const { age, weight, height } = req.body;

  // BMI calculation
  const bmi = weight / (height * height);

  let result = "";
  if (bmi > 25) {
    result = "High Risk (Obesity)";
  } else {
    result = "Normal";
  }

  res.json({
    bmi: bmi.toFixed(2),
    result
  });
});

module.exports = router;