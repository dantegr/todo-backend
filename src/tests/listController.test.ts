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
  ITodoList,
  shareListWith,
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

  describe("shareListWith Unit Tests", () => {
    it("should successfully share the list with the user", async () => {
      const req = {
        body: { userEmail: "test@example.com", listId: "list_123" },
      } as Request;
      const res = mockResponse() as Response;

      const mockUser = { _id: "user_123", email: "test@example.com" };
      const mockTodoList = {
        _id: "list_123",
        sharedWith: [],
        save: jest
          .fn()
          .mockResolvedValueOnce({ _id: "list_123", sharedWith: ["user_123"] }),
      };

      jest.spyOn(User, "findOne").mockResolvedValueOnce(mockUser as any);
      jest
        .spyOn(TodoList, "findById")
        .mockResolvedValueOnce(mockTodoList as any);

      await shareListWith(req, res);

      expect(mockTodoList.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        _id: "list_123",
        sharedWith: ["user_123"],
      });
    });

    it("should return an error if the user is not found", async () => {
      const req = {
        body: { userEmail: "nonexistent@example.com", listId: "list_123" },
      } as Request;
      const res = mockResponse() as Response;

      jest.spyOn(User, "findOne").mockResolvedValueOnce(null);

      await shareListWith(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    it("should return an error if the todo list is not found", async () => {
      const req = {
        body: { userEmail: "test@example.com", listId: "nonexistent" },
      } as Request;
      const res = mockResponse() as Response;

      const mockUser = { _id: "user_123", email: "test@example.com" };
      jest.spyOn(User, "findOne").mockResolvedValueOnce(mockUser as any);
      jest.spyOn(TodoList, "findById").mockResolvedValueOnce(null);

      await shareListWith(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Todo list not found" });
    });

    it("should return an error if the user is already shared", async () => {
      const req = {
        body: { userEmail: "test@example.com", listId: "list_123" },
      } as Request;
      const res = mockResponse() as Response;

      const mockUser = { _id: "user_123", email: "test@example.com" };
      const mockTodoList = {
        _id: "list_123",
        sharedWith: ["user_123"],
        save: jest.fn(),
      };

      jest.spyOn(User, "findOne").mockResolvedValueOnce(mockUser as any);
      jest
        .spyOn(TodoList, "findById")
        .mockResolvedValueOnce(mockTodoList as any);

      await shareListWith(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "User is already shared with this list",
      });
    });

    it("should return an error if missing required parameters", async () => {
      const req = { body: { listId: "list_123" } } as Request; // Missing userEmail
      const res = mockResponse() as Response;

      await shareListWith(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "UserEmail and ListId are required",
      });
    });
  });

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
        save: jest.fn().mockResolvedValueOnce({
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

      jest
        .spyOn(TodoList, "findById")
        .mockResolvedValueOnce(frozenList as ITodoList);

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
    let io: Partial<Server>, socket: Socket;
    let updateTodoListSpy: jest.SpyInstance;

    beforeEach(() => {
      io = {
        emit: jest.fn(),
      };
      socket = {
        on: jest.fn(),
        emit: jest.fn(),
      } as unknown as Socket;

      handleListUpdateSocket(socket as Socket, io as Server);
      updateTodoListSpy = jest.spyOn(
        require("../controllers/listController"),
        "updateTodoList"
      );
    });

    afterEach(() => {
      updateTodoListSpy.mockRestore();
    });

    it("should emit an error if userId or listId is missing", async () => {
      // Manually trigger the event
      await (socket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === "updateList"
      )?.[1]({
        userId: "", // Missing userId
        updatedToDoList: { _id: "" }, // Missing listId
      });

      // Ensure the error event is emitted
      expect(socket.emit).toHaveBeenCalledWith(
        "error",
        "UserId and List ID are required"
      );
    });

    it("should emit an error if the list update fails", async () => {
      updateTodoListSpy.mockRejectedValue(new Error("Update failed"));

      // Manually trigger the "updateList" event
      await (socket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === "updateList"
      )?.[1]({
        userId: "123",
        updatedToDoList: { _id: "456" },
      });

      // Verify that an error is emitted
      expect(socket.emit).toHaveBeenCalledWith(
        "error",
        "Error updating todo list"
      );
    });

    it("should broadcast the updated list to all clients", async () => {
      const mockUpdatedList = { _id: "456", title: "Updated List" };
      updateTodoListSpy.mockResolvedValue(mockUpdatedList);

      // Trigger the "updateList" event manually
      await (socket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === "updateList"
      )?.[1]({
        userId: "123",
        updatedToDoList: { _id: "456" },
      });

      // Verify the broadcast was sent
      expect(io.emit).toHaveBeenCalledWith("listUpdated", mockUpdatedList);
    });

    it("should emit 'disconnected' when user disconnects", () => {
      // Retrieve the 'disconnect' handler from Jest's mock calls
      const disconnectHandler = (socket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === "disconnect"
      )?.[1];

      if (disconnectHandler) {
        disconnectHandler(); // Manually trigger the disconnect event
      }

      expect(socket.emit).toHaveBeenCalledWith("disconnected");
    });
  });
});
