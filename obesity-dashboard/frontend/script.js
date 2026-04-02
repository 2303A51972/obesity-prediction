const API = "http://localhost:5000/api";

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

    localStorage.setItem("token", data.token);

    // 🚀 Direct redirect
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    alert("Backend not running ❌");
  }
}

// ================= LOAD DASHBOARD =================
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/data/stats`);
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

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ================= NAVIGATION =================
function goRegister() {
  window.location.href = "index.html";
}