import mongoose from "mongoose";

// Define Custom Field Interface & Schema
interface ICustomField {
  title: string;
  value: string | number | boolean;
}

const CustomFieldSchema = new mongoose.Schema<ICustomField>({
  title: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }, // Allows string, number, or boolean
});

// Define Subtask Interface & Schema (Supports infinite nesting)
interface ISubtask {
  id: string;
  title: string;
  done: boolean;
  required: boolean;
  subtasks?: ISubtask[]; // Self-referencing for infinite nesting
}

const SubtaskSchema = new mongoose.Schema<ISubtask>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  subtasks: [this], // Self-reference for infinite nesting
});

// Define Item Interface & Schema (Includes subtasks)
interface IItem {
  id: string;
  title: string;
  done: boolean;
  cost: number;
  required: boolean;
  type?: string;
  customFields?: ICustomField[]; // Custom fields
  subtasks: ISubtask[];
}

const ItemSchema = new mongoose.Schema<IItem>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
  cost: { type: Number, required: true, default: 0 },
  required: { type: Boolean, default: false },
  type: { type: String, required: false },
  customFields: [CustomFieldSchema], // Custom fields array
  subtasks: [SubtaskSchema], // Nested subtasks
});

// Define Todo List Interface & Schema
interface ITodoList extends Document {
  title: string;
  ownerId: string; // Owner ID as a string
  sharedWith: string[]; // Array of user IDs (strings) who have access
  frozen: boolean;
  items: IItem[];
  completed: boolean;
}

const TodoListSchema = new mongoose.Schema<ITodoList>(
  {
    title: { type: String, required: true }, // List title
    ownerId: { type: String, required: true }, // Owner as a string ID
    sharedWith: [{ type: String }], // List of user IDs (strings) who have access
    frozen: { type: Boolean, default: false }, // Freeze/unfreeze list
    completed: { type: Boolean, default: false },
    items: [ItemSchema], // List of items
  },
  { timestamps: true } // Automatically adds createdAt & updatedAt
);

// Create and export the model
const TodoList = mongoose.model<ITodoList>(
  "TodoList",
  TodoListSchema,
  "todoLists"
);
export default TodoList;
