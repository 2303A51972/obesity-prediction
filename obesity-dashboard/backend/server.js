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

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

app.get("/", (req, res) => {
	res.json({ status: "ok", message: "Obesity Dashboard backend is running" });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/data", require("./routes/data"));

app.listen(5000, () => console.log("Server running on port 5000"));