const express = require("express");
var cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

const courseData = require("./courseDetails.json");

app.use(cors());
app.use(express.json());

// const verifyJWT = (req, res, next) => {
//   const authorization = req.headers.authorization;
//   if (!authorization) {
//     return res.status(401).send({ error: true, message: "Unauthorize Access" });
//   }

//   // bearer token
//   const token = authorization.split(" ")[1];

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       return res
//         .status(401)
//         .send({ error: true, message: "Unauthorize Access" });
//     }
//     req.decoded = decoded;
//     next();
//   });
// };
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized accessed" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access " });
    }
    req.decoded = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("hello world");
});

const uri = `mongodb+srv://${process.env.DB_USer}:${process.env.DB_PASS}@cluster0.dowmgti.mongodb.net/?retryWrites=true&w=majority`;
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
    // await client.connect();

    const usersCollection = client.db("online_courses").collection("users");
    const coursesCollection = client.db("online_courses").collection("courses");
    const cartCollection = client.db("online_courses").collection("carts");

    // jwt sign
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // creating users
    app.post("/users", verifyJWT, async (req, res) => {
      const users = req.body;
      const query = { email: users.email };

      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await usersCollection.insertOne(users);
      res.send(users);
    });
    // get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Update user role
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.body.userId;
      const filter = { _id: new ObjectId(id) };
      const query = req.body.role;
      const updatedDoc = {
        $set: {
          role: query === "student" ? "admin" : "student",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // delete a user
    app.delete("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // get all courses
    app.get("/courses", async (req, res) => {
      const result = await coursesCollection.find().toArray();
      res.send(result);
    });

    // get specific course details using course id
    app.get("/courseDetails/:id", async (req, res) => {
      const courseId = req.params.id;
      const query = { _id: new ObjectId(courseId) };
      const result = await coursesCollection.findOne(query);
      res.send(result);
    });

    // get course from cart
    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access" });
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      return res.send(result);
    });

    // add course to cart
    app.post("/carts", async (req, res) => {
      const cartData = req.body;
      try {
        const result = await cartCollection.insertOne(cartData);
        res.json({ success: true, insertedCount: result.insertedCount });
      } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // delete course from cart
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(filter);
      res.send(result);
    });

    // create/launch a new course
    app.post("/launchCourse", async (req, res) => {
      const launchCourse = req.body;
      const result = await coursesCollection.insertOne(launchCourse);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
module.exports = app;
