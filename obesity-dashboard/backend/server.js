const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.set("trust proxy", true);

// API routes first
app.use("/api/auth", require("./routes/auth"));
app.use("/api/data", require("./routes/data"));

// Correct frontend static folder
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Login page
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(frontendPath, "login.html"));
});

// Dashboard page
app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(frontendPath, "dashboard.html"));
});

// Signup page
app.get("/signup.html", (req, res) => {
  res.sendFile(path.join(frontendPath, "signup.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));