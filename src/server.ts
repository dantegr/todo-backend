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
  handleListUpdateSocket,
  updateFreeze,
  shareListWith,
} from "./controllers/listController";
import User from "./models/userModel";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const server = createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  handleListUpdateSocket(socket, io);
});
const PORT = process.env.PORT || 5000;
// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI as string, { dbName: "todoapp" })
  .then(() => {
    console.log("MongoDB Connected");
    server.listen(PORT, () => {
      console.log(`App listening at http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.log(err));

// Auth Routes
app.post("/register", registerUser);
app.post("/login", loginUser);
app.post("/refresh", authMiddleware, refreshToken);
app.get("/getuser/:userId", authMiddleware, getUserById);

// List Routes
app.post("/createlist", authMiddleware, createTodoList);
app.delete("/deletelist", authMiddleware, deleteTodoList);
app.put("/updatefreeze", authMiddleware, updateFreeze);
app.get("/userlists/:userId", authMiddleware, getUserTodoLists);
app.post("/sharelistwith", authMiddleware, shareListWith);

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
