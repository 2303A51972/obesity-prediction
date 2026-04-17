const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection failed. Server will continue without DB.");
    console.error(err.message || err);
  }
};

module.exports = connectDB;