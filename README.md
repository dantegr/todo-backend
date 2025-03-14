# Todo app back end

### Deployed version

You can find a deployed version of the app here [https://todo-frontend-3123.netlify.app](https://todo-frontend-3123.netlify.app)

### Features

-I as a user can create to-do items, such as a grocery list.

- I as another user can collaborate in real-time with user - so that we can (for example) edit our family shopping list together. This achieved by utilizing websockets and in order to do this, 2 users must share the same list.
- I as a user can mark to-do items as "done" - so that I can avoid clutter and focus on things that are still pending.
- I as a user can filter the to-do list and view items that were marked as done - so that I can retrospect on my prior progress.
- I as a user can add sub-tasks to my to-do items - so that I could make logical groups of tasks and see their overall progress.
- I as a user can specify cost/price for a task or a subtask - so that I can track my expenses / project cost.
- I as a user can see the sum of the item costs.
- I as a user can make infinite nested levels of subtasks.
- I as a user can add sub-descriptions of tasks in Markdown and view them as rich text while I'm not editing the descriptions.
- I as a user can create multiple to-do lists where each list has its unique URL that I can share with my friends - so that I could have separate to-do lists for my groceries and work related tasks.
- In addition to regular to-do tasks, I as a user can add "special" typed to-do items, that will have custom style and some required fields:
  - "work", by doing this it applies a blue border at the task
  - "food", b doing this it applies a greem border at the task
- I as a user can change the order of tasks via drag & drop
- I as a user can be sure that my todos will be persisted so that important information is not lost when server restarts
- I as an owner/creator of a certain to-do list can freeze/unfreeze a to-do list I've created to avoid other users from mutating it. the same applies to when a list is marked as completed.

### How to run it localy

- Clone the front end repo [https://github.com/dantegr/todo-frontend](https://github.com/dantegr/todo-frontend)
- Clone the back end repo [https://github.com/dantegr/todo-backend](https://github.com/dantegr/todo-backend)
- Run 'npm instal' once for the frontend and once for the backend to install the required node modules.
- Run 'npm run dev' to start service on the frontend and once more to start the service in the back end.
