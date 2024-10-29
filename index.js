const express = require("express");
const redis = require("redis");
const app = express();

// Create Redis client
const client = redis.createClient();

// Middleware to serve static files from the "public" directory
app.use(express.static("public"));

// Initialize default values in Redis
const initialValues = { header: 0, left: 0, article: 0, right: 0, footer: 0 };
client.mset(Object.entries(initialValues).flat(), (err) => {
  if (err) console.error("Error initializing values in Redis:", err);
});

// Function to get data from Redis
async function getData() {
  return new Promise((resolve, reject) => {
    client.mget(Object.keys(initialValues), (err, values) => {
      if (err) return reject(err);

      const data = Object.fromEntries(
        Object.keys(initialValues).map((key, index) => [key, Number(values[index])])
      );
      resolve(data);
    });
  });
}

// Endpoint to retrieve data
app.get("/data", async (req, res) => {
  try {
    const data = await getData();
    res.send(data);
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).send("Server error");
  }
});

// Endpoint to update a value for a specific key
app.get("/update/:key/:value", async (req, res) => {
  const { key } = req.params;
  const value = Number(req.params.value);

  // Check if the key is valid
  if (!initialValues.hasOwnProperty(key)) {
    return res.status(400).send("Invalid key");
  }

  try {
    client.get(key, (err, reply) => {
      if (err) {
        console.error("Error fetching key from Redis:", err);
        return res.status(500).send("Server error");
      }

      // Calculate the new value and update in Redis
      const newValue = Number(reply) + value;
      client.set(key, newValue);

      // Retrieve updated data to send back to client
      getData().then((data) => {
        res.send(data);
      });
    });
  } catch (error) {
    console.error("Error updating value:", error);
    res.status(500).send("Server error");
  }
});

// Start server on port 3000
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

// Gracefully close Redis client on server exit
process.on("exit", () => {
  client.quit();
});
