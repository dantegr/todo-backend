import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import authMiddleware from "../middleware/authMiddleware";
import dotenv from "dotenv";

dotenv.config();

jest.mock("jsonwebtoken");

// Helper function to create a mock response
const mockResponse = (): Partial<Response> => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
};

// Helper function to create a mock request
const mockRequest = (token: string | null): Partial<Request> => {
  return {
    header: jest.fn().mockReturnValue(token),
  };
};

describe("Auth Middleware Unit Tests", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if no token is provided", () => {
    const req = mockRequest(null) as Request;
    const res = mockResponse() as Response;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 400 if token is invalid", () => {
    const req = mockRequest("invalidToken") as Request;
    const res = mockResponse() as Response;

    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next function if token is valid", () => {
    const req = mockRequest("validToken") as Request;
    const res = mockResponse() as Response;

    (jwt.verify as jest.Mock).mockReturnValue({ userId: "12345" });

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
