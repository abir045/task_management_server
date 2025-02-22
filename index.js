const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0s0bbgg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("TaskManagement").collection("users");

    //users
    app.post("/users", async (req, res) => {
      const item = req.body;
      const query = { email: item.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exits", insertedId: null });
      }
      const result = await userCollection.insertOne(item);
      res.send(result);
    });

    app.post("/users/:email/tasks", async (req, res) => {
      const email = req.params.email;
      const task = req.body;
      task.createdAt = new Date();
      task.taskId = new ObjectId().toString();

      const result = await userCollection.updateOne(
        { email: email },
        { $push: { tasks: task } },
        { upsert: true }
      );
      res.send(result);
    });

    app.get("/users/:email/tasks", async (req, res) => {
      const email = req.params.email;

      const user = await userCollection.findOne(
        { email: email },
        { projection: { tasks: 1 } }
      );
      res.send(user.tasks);
    });

    // Update a task
    app.put("/users/:email/tasks/:taskId", async (req, res) => {
      const email = req.params.email;
      const taskId = req.params.taskId;
      const updatedTask = req.body;

      // Keep the original taskId
      updatedTask.taskId = taskId;
      // Update the timestamp
      updatedTask.updatedAt = new Date();

      const result = await userCollection.updateOne(
        {
          email: email,
          "tasks.taskId": taskId,
        },
        {
          $set: { "tasks.$": updatedTask },
        }
      );

      res.send(result);
    });

    app.delete("/users/:email/tasks/:taskId", async (req, res) => {
      try {
        const { email, taskId } = req.params;

        // Remove the task from the tasks array
        const result = await userCollection.updateOne(
          { email: email },
          {
            $pull: {
              tasks: { taskId: taskId },
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        if (result.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Task not found",
          });
        }

        res.status(200).json({
          success: true,
          message: "Task deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Task Management server is running");
});

app.listen(port, () => {
  console.log(`task Management is running on port ${port}`);
});
