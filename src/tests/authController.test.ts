import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  registerUser,
  loginUser,
  refreshToken,
  getUserById,
} from "../controllers/authController";
import User from "../models/userModel";
import dotenv from "dotenv";

dotenv.config();

jest.mock("../models/userModel");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

// Helper function to create a mock response
const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn();
  return res;
};

describe("Auth Controller Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should register a new user", async () => {
      const req = {
        body: {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
        },
      } as Request;
      const res = mockResponse();

      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedpassword");
      (User.prototype.save as jest.Mock).mockResolvedValueOnce(undefined);

      await registerUser(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User registered successfully",
      });
    });
  });

  describe("loginUser", () => {
    it("should log in an existing user and return accessToken and userId", async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = {
        body: { username: "testuser", password: "password123" },
      } as Request;
      const res = mockResponse();

      (User.findOne as jest.Mock).mockResolvedValueOnce({
        _id: userId,
        password: "hashedpassword",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("mockedAccessToken");

      await loginUser(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        accessToken: "mockedAccessToken",
        userId: userId,
      });
    });
  });

  describe("refreshToken", () => {
    it("should refresh access token", async () => {
      const req = {
        body: { userId: new mongoose.Types.ObjectId().toString() },
      } as Request;
      const res = mockResponse();

      (jwt.sign as jest.Mock).mockReturnValue("newMockedAccessToken");

      await refreshToken(req, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        accessToken: "newMockedAccessToken",
      });
    });
  });

  describe("getUserById", () => {
    it("should return user data when given a valid user ID", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const req = { params: { userId } } as unknown as Request;
      const res = mockResponse() as Response;

      const mockUser = {
        _id: userId,
        username: "testuser",
        email: "test@example.com",
      };

      (User.findById as jest.Mock).mockResolvedValueOnce(mockUser);

      await getUserById(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it("should return 404 if user is not found", async () => {
      const req = { params: { userId: "invalidUserId" } } as unknown as Request;
      const res = mockResponse() as Response;

      (User.findById as jest.Mock).mockResolvedValueOnce(null);

      await getUserById(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    it("should return 400 if userId is not provided", async () => {
      const req = { params: {} } as Request;
      const res = mockResponse() as Response;

      await getUserById(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "User ID is required" });
    });

    it("should return 500 if there is a server error", async () => {
      const req = { params: { userId: "someUserId" } } as unknown as Request;
      const res = mockResponse() as Response;

      jest.spyOn(User, "findById").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      await getUserById(req, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Error retrieving user" });
    });
  });
});
