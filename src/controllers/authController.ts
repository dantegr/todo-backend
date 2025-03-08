import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel";
import dotenv from "dotenv";

dotenv.config();

// Generate Access Token
const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: "60m",
  });
};

// Register User
export const registerUser = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error registering user" });
  }
};

// Login User
export const loginUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      res.status(400).json({ error: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    const accessToken = generateAccessToken(user._id as string);

    res.json({ accessToken, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: "Error logging in" });
  }
};

// Refresh Access Token
export const refreshToken = async (req: Request, res: Response) => {
  const { userId } = req.body;
  try {
    const newAccessToken = generateAccessToken(userId as string);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ error: "Could not refresh access token" });
  }
};
