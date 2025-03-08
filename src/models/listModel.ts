import mongoose from "mongoose";

// Define Custom Field Interface & Schema
interface ICustomField {
  title: string;
  value: string | number | boolean;
  required: boolean;
}

const CustomFieldSchema = new mongoose.Schema<ICustomField>({
  title: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }, // Allows string, number, or boolean
  required: { type: Boolean, default: false },
});

// Define Subtask Interface & Schema (Supports infinite nesting)
interface ISubtask {
  title: string;
  done: boolean;
  cost: number;
  required: boolean;
  type?: string; // Optional task type
  customFields?: ICustomField[]; // Custom fields
  subtasks?: ISubtask[]; // Self-referencing for infinite nesting
}

const SubtaskSchema = new mongoose.Schema<ISubtask>({
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
  cost: { type: Number, required: true, default: 0 },
  required: { type: Boolean, default: false },
  type: { type: String, required: false },
  customFields: [CustomFieldSchema], // Custom fields array
  subtasks: [this], // Self-reference for infinite nesting
});

// Define Item Interface & Schema (Includes subtasks)
interface IItem {
  index: number;
  title: string;
  done: boolean;
  cost: number;
  required: boolean;
  type?: string;
  customFields?: ICustomField[]; // Custom fields
  subtasks: ISubtask[];
}

const ItemSchema = new mongoose.Schema<IItem>({
  index: { type: Number, required: true },
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
}

const TodoListSchema = new mongoose.Schema<ITodoList>(
  {
    title: { type: String, required: true }, // List title
    ownerId: { type: String, required: true }, // Owner as a string ID
    sharedWith: [{ type: String }], // List of user IDs (strings) who have access
    frozen: { type: Boolean, default: false }, // Freeze/unfreeze list
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
