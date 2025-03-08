import { Request, Response } from "express";
import mongoose from "mongoose";
import TodoList from "../models/listModel";
import User from "../models/userModel";
import {
  createTodoList,
  deleteTodoList,
  getUserTodoLists,
} from "../controllers/listController";

describe("List Controller Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Mock response helper
  const mockResponse = (): Partial<Response> => {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  };

  describe("createTodoList", () => {
    it("should create a new todo list", async () => {
      const req = { body: { userId: "12345" } } as Request;
      const res = mockResponse() as Response;

      jest
        .spyOn(User, "findById")
        .mockResolvedValueOnce({ _id: "12345" } as any);
      jest
        .spyOn(TodoList.prototype, "save")
        .mockResolvedValueOnce({ _id: "67890", ownerId: "12345" } as any);

      await createTodoList(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: "67890", ownerId: "12345" });
    });
  });

  describe("deleteTodoList", () => {
    it("should delete a todo list if user is the owner", async () => {
      const req = { body: { listId: "67890", userId: "12345" } } as Request;
      const res = mockResponse() as Response;

      jest
        .spyOn(TodoList, "findById")
        .mockResolvedValueOnce({ _id: "67890", ownerId: "12345" } as any);
      jest.spyOn(TodoList, "findByIdAndDelete").mockResolvedValueOnce(null);

      await deleteTodoList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Todo list deleted successfully",
      });
    });

    it("should return an error if the user is not the owner", async () => {
      const req = { body: { listId: "67890", userId: "54321" } } as Request;
      const res = mockResponse() as Response;

      jest
        .spyOn(TodoList, "findById")
        .mockResolvedValueOnce({ _id: "67890", ownerId: "12345" } as any);

      await deleteTodoList(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "User is not authorized to delete this list",
      });
    });
  });

  describe("getUserTodoLists", () => {
    it("should return lists shared with the user", async () => {
      const req = { params: { userId: "12345" } } as unknown as Request;
      const res = mockResponse() as Response;

      const mockLists = [
        { _id: "67890", ownerId: "12345", sharedWith: ["12345"] },
      ];
      jest.spyOn(TodoList, "find").mockResolvedValueOnce(mockLists as any);

      await getUserTodoLists(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockLists);
    });
  });
});
