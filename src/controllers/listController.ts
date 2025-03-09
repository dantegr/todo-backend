import { Request, Response } from "express";
import { Server, Socket } from "socket.io";
import TodoList from "../models/listModel";
import User from "../models/userModel";

export interface ITodoList {
  _id: string;
  title: string;
  ownerId: string;
  sharedWith: string[];
  frozen: boolean;
  items: Array<{
    index: number;
    title: string;
    done: boolean;
    cost: number;
    required: boolean;
    type?: string;
    customFields?: Array<{
      title: string;
      value: string | number | boolean;
      required: boolean;
    }>;
    subtasks?: any[];
  }>;
}

const connectedUsers: Record<string, NodeJS.Timeout> = {};

export const resetUserTimer = (userId: string) => {
  if (connectedUsers[userId]) {
    clearTimeout(connectedUsers[userId]);
  }
  connectedUsers[userId] = setTimeout(() => {
    delete connectedUsers[userId];
  }, 60 * 60 * 1000); // Remove after 1 hour of inactivity
};

// Create a new TodoList
export const createTodoList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.body; // Extract userId from request body

    if (!userId) {
      res.status(400).json({ error: "UserId is required" });
      return;
    }

    // Check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const newList = new TodoList({
      title: "New Todo List",
      ownerId: userId,
      sharedWith: [userId], // Include user in sharedWith
      frozen: false,
      items: [], // No items initially
    });

    const savedList = await newList.save();
    res.status(201).json(savedList);
  } catch (error) {
    res.status(500).json({ error: "Error creating todo list" });
  }
};

// Delete a TodoList
export const deleteTodoList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { listId, userId } = req.body;

    if (!listId || !userId) {
      res.status(400).json({ error: "List ID and User ID are required" });
      return;
    }

    // Find the list
    const todoList = await TodoList.findById(listId);
    if (!todoList) {
      res.status(404).json({ error: "Todo list not found" });
      return;
    }

    // Check if the user is the owner
    if (todoList.ownerId !== userId) {
      res
        .status(403)
        .json({ error: "User is not authorized to delete this list" });
      return;
    }

    await TodoList.findByIdAndDelete(listId);
    res.status(200).json({ message: "Todo list deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting todo list" });
  }
};

export const getUserTodoLists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: "UserId is required" });
      return;
    }

    const todoLists = await TodoList.find({ sharedWith: userId });
    res.status(200).json(todoLists);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving todo lists" });
  }
};

export const updateTodoList = async (
  id: string,
  updates: Partial<ITodoList>
): Promise<ITodoList> => {
  try {
    if (!id) {
      throw new Error("TodoList ID is required");
    }

    // Find and update the TodoList
    const updatedList = (await TodoList.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })) as ITodoList;

    if (!updatedList) {
      throw new Error("TodoList not found");
    }

    return updatedList;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error("Error updating todo list: " + error.message);
    } else {
      throw new Error("Error updating todo list: Unknown error occurred");
    }
  }
};

export const handleListUpdateSocket = (socket: Socket, io: Server) => {
  socket.on("join", (userId: string) => {
    if (userId) {
      resetUserTimer(userId);
    }
  });

  socket.on(
    "updateList",
    async ({
      userId,
      updatedToDoList,
    }: {
      userId: string;
      updatedToDoList: Partial<ITodoList>;
    }) => {
      try {
        if (!userId || !updatedToDoList._id) {
          socket.emit("error", "UserId and List ID are required");
          return;
        }

        resetUserTimer(userId); // Reset timer on every update

        const updatedList = await updateTodoList(
          updatedToDoList._id,
          updatedToDoList
        );

        if (!updatedList) {
          socket.emit("error", "Failed to update todo list");
          return;
        }

        const recipients = updatedList.sharedWith.filter(
          (id) => connectedUsers[id]
        );
        recipients.forEach((recipient) => {
          io.to(recipient).emit("listUpdated", updatedList);
        });
      } catch (error) {
        socket.emit("error", "Error updating todo list");
      }
    }
  );

  socket.on("disconnect", (userId: string) => {
    if (connectedUsers[userId]) {
      clearTimeout(connectedUsers[userId]);
      delete connectedUsers[userId];
    }
  });
};
