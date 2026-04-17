const API = "http://localhost:5000/api";
const GOOGLE_REDIRECT_ENDPOINT = `${API}/auth/google/start`;
const PREDICTION_HISTORY_KEY = "obesityPredictionHistory";

function getStoredToken() {
  return localStorage.getItem("token");
}

function getAuthHeaders(extraHeaders = {}) {
  const token = getStoredToken();
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function redirectToLogin() {
  window.location.href = "login.html";
}

async function enforceAuthenticatedDashboard() {
  const isDashboardPage = document.body.classList.contains("dashboard-page");
  if (!isDashboardPage) return;

  const token = getStoredToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const res = await fetch(`${API}/data/stats`, {
      headers: getAuthHeaders(),
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      redirectToLogin();
      return;
    }

    const profileName = document.getElementById("profileName");
    if (profileName) {
      profileName.textContent = "Signed In User";
    }
  } catch (err) {
    localStorage.removeItem("token");
    redirectToLogin();
  }
}

function handleAuthSuccess(data) {
  localStorage.setItem("token", data.token);
  window.location.href = "dashboard.html";
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function showLoginPageError() {
  const error = getQueryParam("error");

  if (!error) return;

  const messages = {
    google_not_configured: "Google Sign-In is not fully configured. Add GOOGLE_CLIENT_SECRET in backend/.env and set the redirect URI in Google Cloud Console.",
    missing_code: "Google Sign-In did not return an authorization code.",
    missing_id_token: "Google Sign-In did not return an ID token.",
    google_email_missing: "Google account email was not available.",
    google_callback_failed: "Google Sign-In failed during callback.",
  };

  alert(messages[error] || "Google Sign-In failed.");
  window.history.replaceState({}, document.title, window.location.pathname);
}

function consumeGoogleTokenFromUrl() {
  const token = getQueryParam("token");
  if (!token) return;

  localStorage.setItem("token", token);
  window.history.replaceState({}, document.title, window.location.pathname);
}

function signInWithGoogle() {
  window.location.href = GOOGLE_REDIRECT_ENDPOINT;
}

function showGoogleOriginHelp() {
  alert(
    "Google sign-in now uses a backend redirect flow. If you still see an error, add this redirect URI in Google Cloud Console:\n\n" +
    "http://localhost:5000/api/auth/google/callback\n\n" +
    "Also set backend/.env with GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI."
  );
}

// ================= REGISTER =================
async function register() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    console.log("Register:", data);

    if (!res.ok) {
      alert(data.msg || "Registration failed");
      return;
    }

    alert("Registered Successfully ✅");
    window.location.href = "login.html";

  } catch (err) {
    console.error(err);
    alert("Server not running ❌");
  }
}

// ================= LOGIN =================
async function login() {
  console.log("Login clicked");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    console.log("Login:", data);

    if (!res.ok) {
      alert(data.msg || "Login failed");
      return;
    }

    handleAuthSuccess(data);

  } catch (err) {
    console.error(err);
    alert("Backend not running ❌");
  }
}

// ================= LOAD DASHBOARD =================
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/data/stats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return;

    const data = await res.json();

    document.getElementById("patients").innerText = data.totalPatients;
    document.getElementById("rate").innerText = data.obesityRate;
    document.getElementById("auc").innerText = data.auc;
    document.getElementById("recall").innerText = data.recall;

  } catch (err) {
    console.error(err);
  }
}

// ================= PREDICTION =================
function predict() {
  const age = document.getElementById("age").value;
  const weight = document.getElementById("weight").value;
  const heightCm = document.getElementById("height").value;

  if (!age || !weight || !heightCm) {
    alert("Fill all fields");
    return;
  }

  const height = heightCm / 100; // cm → meters
  const bmi = weight / (height * height);

  let result = "";
  let tips = "";

  if (bmi < 18.5) {
    result = "Underweight ⚠️";
    tips = "Eat healthy foods, include proteins and nutrients.";
  } 
  else if (bmi < 25) {
    result = "Healthy ✅";
    tips = "Maintain your diet and exercise regularly.";
  } 
  else if (bmi < 30) {
    result = "Overweight ⚠️";
    tips = "Reduce junk food and increase physical activity.";
  } 
  else {
    result = "High Obesity Risk 🚨";
    tips = "Consult a doctor, follow strict diet and daily exercise.";
  }

  // 🎯 Age-based tips
  if (age < 10) {
    tips += " Ensure proper nutrition for child growth.";
  } else if (age > 40) {
    tips += " Regular health checkups are recommended.";
  }

  document.getElementById("result").innerText = result;
  document.getElementById("tips").innerText = tips;
}

function syncRangeLabel(inputId, labelId, suffix = "") {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if (!input || !label) return;

  label.textContent = `${input.value}${suffix}`;
}

const REPORT_CONTENT = {
  healthy: {
    title: "Normal Weight",
    riskText:
      "The individual is within the healthy weight range for their height. However, low physical activity and occasional alcohol consumption can still become risk factors over time if not monitored.",
    recommendations: [
      "Aim for at least 150 minutes of moderate-intensity activity every week",
      "Include 2 weekly strength sessions to support body composition",
      "Continue hydration with around 2 liters of water daily",
      "Maintain portion awareness to avoid gradual weight gain",
    ],
    diet: {
      breakfast: [
        "1 cup steel-cut oats with fresh berries and 1 tbsp chia seeds",
        "2 boiled egg whites",
      ],
      lunch: [
        "1 bowl brown rice with grilled chicken and mixed salad",
        "1 cup yogurt (unsweetened)",
      ],
      dinner: [
        "Grilled fish with sauteed vegetables",
        "Small bowl lentil soup",
      ],
      snacks: [
        "One medium apple or pear",
        "A small handful (30g) of raw almonds",
      ],
      proTips: [
        "Increase vegetable intake to at least 3 servings daily",
        "Maintain a consistent meal schedule",
        "Limit sugary beverages and liquid calories",
      ],
    },
  },
  moderate: {
    title: "Moderate Risk",
    riskText:
      "Current inputs suggest a moderate obesity risk profile. Dietary composition and activity frequency should be improved to prevent further metabolic stress.",
    recommendations: [
      "Reduce high-calorie processed foods and sugary snacks",
      "Add brisk walking or light cardio on at least 4 days/week",
      "Increase fiber intake through vegetables and legumes",
      "Track weekly weight and waist circumference consistently",
    ],
    diet: {
      breakfast: [
        "Vegetable omelette with 1 whole-grain toast",
        "Unsweetened green tea",
      ],
      lunch: [
        "Millet roti with mixed vegetable curry",
        "Cucumber-tomato salad",
      ],
      dinner: [
        "Grilled paneer/tofu with steamed broccoli",
        "Clear vegetable soup",
      ],
      snacks: [
        "Roasted chickpeas",
        "Plain yogurt with flax seeds",
      ],
      proTips: [
        "Avoid late-night heavy meals",
        "Use smaller plates for better portion control",
        "Prioritize protein at each meal",
      ],
    },
  },
  high: {
    title: "High Obesity Risk",
    riskText:
      "Inputs indicate elevated obesity risk and stronger chances of future metabolic complications if lifestyle changes are delayed.",
    recommendations: [
      "Begin a structured weight-management plan with professional supervision",
      "Start with low-impact cardio for 20-30 minutes daily",
      "Completely reduce sugar-sweetened beverages",
      "Schedule periodic blood pressure and glucose monitoring",
    ],
    diet: {
      breakfast: [
        "Moong dal chilla with mint chutney",
        "1 bowl mixed fruit (low glycemic options)",
      ],
      lunch: [
        "Quinoa bowl with lean protein and steamed greens",
        "Buttermilk (unsalted)",
      ],
      dinner: [
        "Light vegetable stir-fry with tofu",
        "Lentil soup without cream",
      ],
      snacks: [
        "Carrot and cucumber sticks",
        "Small serving roasted seeds",
      ],
      proTips: [
        "Keep sodium intake low to support cardiovascular health",
        "Avoid alcohol during the initial fat-loss phase",
        "Sleep 7-8 hours to improve metabolic recovery",
      ],
    },
  },
  under: {
    title: "Underweight Risk",
    riskText:
      "The profile suggests underweight tendency. Balanced caloric intake with nutrient density is recommended to improve healthy body composition.",
    recommendations: [
      "Increase meal frequency with balanced protein and complex carbs",
      "Include healthy fats such as nuts, seeds, and olive oil",
      "Add resistance training to build lean mass",
      "Consult a clinician if appetite or weight loss persists",
    ],
    diet: {
      breakfast: [
        "Peanut butter toast with banana",
        "Milk or soy milk smoothie with oats",
      ],
      lunch: [
        "Rice with dal, vegetables, and curd",
        "Paneer/chicken side serving",
      ],
      dinner: [
        "Whole-wheat pasta with mixed vegetables and protein",
        "Soup with beans",
      ],
      snacks: [
        "Dates with mixed nuts",
        "Homemade trail mix",
      ],
      proTips: [
        "Do not skip breakfast",
        "Prefer calorie-dense but nutrient-rich foods",
        "Hydrate, but avoid filling up only with water before meals",
      ],
    },
  },
};

let currentReport = null;
let selectedHistoryIds = new Set();

function getHistoryEntryId(entry, index) {
  if (entry.id) return entry.id;
  return `${entry.timestamp || "t"}-${entry.bmi || "b"}-${entry.score || "s"}-${index}`;
}

function getPredictionHistory() {
  try {
    const raw = localStorage.getItem(PREDICTION_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function savePredictionHistoryEntry(entry) {
  const current = getPredictionHistory();
  current.unshift({
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
  const trimmed = current.slice(0, 25);
  localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(trimmed));
}

function renderPredictionHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;

  const entries = getPredictionHistory();
  if (!entries.length) {
    list.innerHTML = '<p class="history-empty">No prediction history yet. Generate a prediction to see entries here.</p>';
    return;
  }

  list.innerHTML = entries
    .map((item, index) => {
      const entryId = getHistoryEntryId(item, index);
      const time = new Date(item.timestamp).toLocaleString();
      return (
        `<article class="history-item">` +
        `<div class="history-item-head">` +
        `<h4>${item.level}</h4>` +
        `<label class="history-select"><input type="checkbox" ${selectedHistoryIds.has(entryId) ? "checked" : ""} onchange="setHistorySelection('${entryId}', this.checked)"> Select</label>` +
        `</div>` +
        `<p><strong>BMI:</strong> ${item.bmi}</p>` +
        `<p><strong>Age/Height/Weight:</strong> ${item.age} / ${item.heightCm}cm / ${item.weight}kg</p>` +
        `<p><strong>Score:</strong> ${item.score}</p>` +
        `<p><strong>Time:</strong> ${time}</p>` +
        `</article>`
      );
    })
    .join("");
}

function toggleHistoryPanel(forceOpen) {
  const panel = document.getElementById("historyPanel");
  if (!panel) return;

  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !shouldOpen);

  if (shouldOpen) {
    renderPredictionHistory();
  }
}

function setHistorySelection(entryId, checked) {
  if (checked) {
    selectedHistoryIds.add(entryId);
  } else {
    selectedHistoryIds.delete(entryId);
  }
}

function clearSelectedHistory() {
  const entries = getPredictionHistory();
  if (!entries.length) return;

  if (!selectedHistoryIds.size) {
    alert("Select one or more history items to clear.");
    return;
  }

  const filtered = entries.filter((entry, index) => {
    const entryId = getHistoryEntryId(entry, index);
    return !selectedHistoryIds.has(entryId);
  });

  localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(filtered));
  selectedHistoryIds.clear();
  renderPredictionHistory();
}

function clearPredictionHistory() {
  localStorage.removeItem(PREDICTION_HISTORY_KEY);
  selectedHistoryIds.clear();
  renderPredictionHistory();
}

function showWorkflow(viewId) {
  const ids = ["assessmentView", "loadingView", "reportView"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("hidden", id !== viewId);
  });
}

function setDietTab(tab) {
  if (!currentReport) return;

  const tabs = ["breakfast", "lunch", "dinner"];
  tabs.forEach((name) => {
    const tabEl = document.getElementById(`tab-${name}`);
    if (tabEl) tabEl.classList.toggle("active", name === tab);
  });

  const dietList = document.getElementById("dietList");
  if (!dietList) return;

  const items = currentReport.diet[tab] || [];
  dietList.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function renderReport(levelKey, bmi, score) {
  const content = REPORT_CONTENT[levelKey] || REPORT_CONTENT.healthy;
  currentReport = content;

  const riskTitle = document.getElementById("riskTitle");
  const bmiValue = document.getElementById("bmiValue");
  const riskText = document.getElementById("riskText");
  const recommendationGrid = document.getElementById("recommendationGrid");
  const snackChips = document.getElementById("snackChips");
  const proTips = document.getElementById("proTips");

  if (riskTitle) riskTitle.textContent = content.title;
  if (bmiValue) bmiValue.textContent = bmi.toFixed(1);
  if (riskText) {
    riskText.textContent = `${content.riskText} Composite risk score: ${score.toFixed(1)}.`;
  }

  if (recommendationGrid) {
    recommendationGrid.innerHTML = content.recommendations
      .map((item) => `<div class="recommendation-item">${item}</div>`)
      .join("");
  }

  if (snackChips) {
    snackChips.innerHTML = content.diet.snacks.map((item) => `<span>${item}</span>`).join("");
  }

  if (proTips) {
    proTips.innerHTML = content.diet.proTips.map((tip) => `<li>${tip}</li>`).join("");
  }

  setDietTab("breakfast");
}

function generateAssessmentPrediction() {
  const age = Number(document.getElementById("age")?.value || 0);
  const weight = Number(document.getElementById("weight")?.value || 0);
  const heightCm = Number(document.getElementById("height")?.value || 0);
  const activity = Number(document.getElementById("activity")?.value || 0);
  const vegetables = Number(document.getElementById("vegetables")?.value || 0);
  const mainMeals = Number(document.getElementById("mainMeals")?.value || 0);
  const highCaloric = document.querySelector("input[name='highCaloric']:checked")?.value || "no";
  const familyHistory = document.querySelector("input[name='familyHistory']:checked")?.value || "no";
  const alcohol = document.getElementById("alcohol")?.value || "none";

  if (!age || !weight || !heightCm) {
    alert("Fill age, height and weight to continue.");
    return;
  }

  const height = heightCm / 100;
  const bmi = weight / (height * height);
  let score = bmi;

  if (highCaloric === "yes") score += 1.2;
  if (familyHistory === "yes") score += 1.4;
  if (activity >= 4) score -= 1.0;
  if (vegetables >= 2) score -= 0.8;
  if (mainMeals >= 4) score += 0.5;
  if (alcohol === "daily") score += 0.8;
  if (age > 40) score += 0.6;

  let levelKey = "healthy";

  if (score >= 30) {
    levelKey = "high";
  } else if (score >= 25) {
    levelKey = "moderate";
  } else if (score < 18.5) {
    levelKey = "under";
  }

  showWorkflow("loadingView");
  setTimeout(() => {
    renderReport(levelKey, bmi, score);
    savePredictionHistoryEntry({
      level: (REPORT_CONTENT[levelKey] || REPORT_CONTENT.healthy).title,
      bmi: bmi.toFixed(1),
      age,
      heightCm,
      weight,
      score: score.toFixed(1),
      timestamp: Date.now(),
    });
    showWorkflow("reportView");
  }, 1900);
}

function goBackToAssessment() {
  showWorkflow("assessmentView");
}

function downloadReport() {
  if (!currentReport) return;

  const bmi = document.getElementById("bmiValue")?.textContent || "N/A";
  const lines = [
    "ObesityPredict AI - Health Report",
    "",
    `Risk Category: ${currentReport.title}`,
    `BMI: ${bmi}`,
    "",
    "Key Recommendations:",
    ...currentReport.recommendations.map((r) => `- ${r}`),
    "",
    "Diet Plan:",
    "Breakfast:",
    ...currentReport.diet.breakfast.map((i) => `- ${i}`),
    "Lunch:",
    ...currentReport.diet.lunch.map((i) => `- ${i}`),
    "Dinner:",
    ...currentReport.diet.dinner.map((i) => `- ${i}`),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "health-report.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ================= NAVIGATION =================
function goRegister() {
  window.location.href = "signup.html";
}

window.signInWithGoogle = signInWithGoogle;
window.syncRangeLabel = syncRangeLabel;
window.generateAssessmentPrediction = generateAssessmentPrediction;
window.setDietTab = setDietTab;
window.goBackToAssessment = goBackToAssessment;
window.downloadReport = downloadReport;
window.toggleHistoryPanel = toggleHistoryPanel;
window.clearPredictionHistory = clearPredictionHistory;
window.clearSelectedHistory = clearSelectedHistory;
window.setHistorySelection = setHistorySelection;

consumeGoogleTokenFromUrl();
showLoginPageError();
enforceAuthenticatedDashboard();

syncRangeLabel("vegetables", "vegVal", " / 3");
syncRangeLabel("mainMeals", "mealVal");
renderPredictionHistory();