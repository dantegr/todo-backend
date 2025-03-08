import { Request, Response } from "express";
import TodoList from "../models/listModel";
import User from "../models/userModel";

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
    console.log(req.params);
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
