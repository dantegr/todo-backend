// Import required modules
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authMiddleware from "./middleware/authMiddleware";
import {
  registerUser,
  loginUser,
  refreshToken,
  getUserById,
} from "./controllers/authController";
import {
  createTodoList,
  deleteTodoList,
  getUserTodoLists,
} from "./controllers/listController";
import User from "./models/userModel";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI as string, { dbName: "todoapp" })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Auth Routes
app.post("/register", registerUser);
app.post("/login", loginUser);
app.post("/refresh", authMiddleware, refreshToken);
app.get("/getuser/:userId", authMiddleware, getUserById);

// List Routes
app.post("/createlist", authMiddleware, createTodoList);
app.delete("/deletelist", authMiddleware, deleteTodoList);
app.get("/userlists/:userId", authMiddleware, getUserTodoLists);

// Protected Route Example
app.get("/protected", authMiddleware, (req, res) => {
  res.json({
    message: "You have accessed a protected route",
    user: (req as any).user,
  });
});

// Get User Email by Username (Protected Route)
app.get("/user-email/:username", authMiddleware, async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ email: user.email });
  } catch (err) {
    res.status(500).json({ error: "Error retrieving user email" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
