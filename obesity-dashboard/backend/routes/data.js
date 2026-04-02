const express = require("express");
const router = express.Router();

// Dashboard stats
router.get("/stats", (req, res) => {
  res.json({
    totalPatients: 860510,
    obesityRate: "17.03%",
    auc: "81%",
    recall: "97.63%"
  });
});

// 🔥 Prediction API
router.post("/predict", (req, res) => {
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