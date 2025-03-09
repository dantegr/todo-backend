import { Request, Response } from "express";
import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import TodoList from "../models/listModel";
import User from "../models/userModel";
import {
  createTodoList,
  deleteTodoList,
  getUserTodoLists,
  updateTodoList,
  handleListUpdateSocket,
  updateFreeze,
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

  describe("updateFreeze", () => {
    it("should successfully update the frozen status when the user is the owner", async () => {
      const req = {
        body: { listId: "list_123", userId: "owner_123", frozen: true },
      } as Request;
      const res = mockResponse() as Response;

      const existingList = {
        _id: "list_123",
        ownerId: "owner_123",
        frozen: false,
        save: jest
          .fn()
          .mockResolvedValueOnce({
            _id: "list_123",
            ownerId: "owner_123",
            frozen: true,
          }),
      };

      jest
        .spyOn(TodoList, "findById")
        .mockResolvedValueOnce(existingList as any);

      await updateFreeze(req, res);

      expect(existingList.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        _id: "list_123",
        ownerId: "owner_123",
        frozen: true,
      });
    });

    it("should return an error if the user is not the owner", async () => {
      const req = {
        body: { listId: "list_123", userId: "not_owner", frozen: true },
      } as Request;
      const res = mockResponse() as Response;

      const existingList = {
        _id: "list_123",
        ownerId: "owner_123",
        frozen: false,
      };
      jest
        .spyOn(TodoList, "findById")
        .mockResolvedValueOnce(existingList as any);

      await updateFreeze(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "User is not authorized to update freeze status",
      });
    });

    it("should return an error if the todo list is not found", async () => {
      const req = {
        body: { listId: "nonexistent", userId: "owner_123", frozen: true },
      } as Request;
      const res = mockResponse() as Response;

      jest.spyOn(TodoList, "findById").mockResolvedValueOnce(null);

      await updateFreeze(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Todo list not found" });
    });

    it("should return an error if missing required parameters", async () => {
      const req = { body: { listId: "list_123", frozen: true } } as Request; // Missing userId
      const res = mockResponse() as Response;

      await updateFreeze(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "List ID, User ID, and frozen status are required",
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

  describe("updateTodoList", () => {
    it("should successfully update a todo list", async () => {
      const listId = "list_123";
      const updates = { title: "Updated Title" };
      const existingList = { _id: listId, frozen: false };
      const updatedList = { _id: listId, ...updates };

      jest
        .spyOn(TodoList, "findById")
        .mockResolvedValueOnce(existingList as any);
      jest
        .spyOn(TodoList, "findByIdAndUpdate")
        .mockResolvedValueOnce(updatedList as any);

      const result = await updateTodoList(listId, updates);
      expect(result).toEqual(updatedList);
    });

    it("should throw an error if the todo list is frozen", async () => {
      const listId = "list_789";
      const updates = { title: "Updated Title" };
      const frozenList = { _id: listId, frozen: true };

      jest.spyOn(TodoList, "findById").mockResolvedValueOnce(frozenList as any);

      await expect(updateTodoList(listId, updates)).rejects.toThrow(
        "The TodoList is frozen by the owner and cannot be updated"
      );
    });

    it("should throw an error if the todo list is not found", async () => {
      const listId = "list_123";
      const updates = { title: "Updated Title" };

      jest.spyOn(TodoList, "findById").mockResolvedValueOnce(null);

      await expect(updateTodoList(listId, updates)).rejects.toThrow(
        "TodoList not found"
      );
    });

    it("should throw an error if no ID is provided", async () => {
      await expect(updateTodoList("", {})).rejects.toThrow(
        "TodoList ID is required"
      );
    });
  });

  describe("handleListUpdateSocket", () => {
    let socket: Partial<Socket>;
    let io: Partial<Server>;
    let resetUserTimerSpy: jest.SpyInstance;
    let updateTodoListSpy: jest.SpyInstance;

    beforeEach(() => {
      socket = {
        on: jest.fn(),
        emit: jest.fn(),
      } as Partial<Socket>;
      io = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as Partial<Server>;
      resetUserTimerSpy = jest.spyOn(
        require("../controllers/listController"),
        "resetUserTimer"
      );
      updateTodoListSpy = jest.spyOn(
        require("../controllers/listController"),
        "updateTodoList"
      );
    });

    it("should add a user to connectedUsers on join", () => {
      const userId = "user_123";
      handleListUpdateSocket(socket as Socket, io as Server);
      (socket.on as jest.Mock).mock.calls.find(
        ([event, handler]) => event === "join"
      )[1](userId);
      expect(resetUserTimerSpy).toHaveBeenCalledWith(userId);
    });

    it("should update a todo list and emit to shared users", async () => {
      const userId = "user_123";
      const listId = "list_456";
      const updatedToDoList = { _id: listId, title: "Updated Title" };
      const updatedList = {
        ...updatedToDoList,
        sharedWith: [userId, "user_789"],
      };

      updateTodoListSpy.mockResolvedValueOnce(updatedList);

      handleListUpdateSocket(socket as Socket, io as Server);
      await (socket.on as jest.Mock).mock.calls.find(
        ([event, handler]) => event === "updateList"
      )[1]({ userId, updatedToDoList });

      expect(updateTodoListSpy).toHaveBeenCalledWith(listId, updatedToDoList);
      expect(io.to).toHaveBeenCalledWith(userId);
      expect(io.emit).toHaveBeenCalledWith("listUpdated", updatedList);
    });
  });
});
