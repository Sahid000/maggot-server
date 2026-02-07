const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://maggot-donation.netlify.app"],
    credentials: true,
  })
);
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Function to generate 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Function to send OTP email
async function sendOTPEmail(email, otp, name) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Login OTP - Maggot Donation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Login Verification</h2>
        <p>Hi ${name},</p>
        <p>Your OTP for login verification is:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666;">This OTP will expire in 5 minutes.</p>
        <p style="color: #666;">If you didn't request this, please ignore this email.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">Maggot Donation Platform</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("maggot-assignment");
    const collection = db.collection("users");
    const otpCollection = db.collection("otp_verifications");
    const ordersCollection = db.collection("orders");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, role, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({
        name,
        email,
        role: "user",
        password: hashedPassword,
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login - Step 1: Verify credentials and send OTP
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

      // Delete any existing OTP for this user
      await otpCollection.deleteMany({ userId: user._id.toString() });

      // Store OTP in database
      await otpCollection.insertOne({
        userId: user._id.toString(),
        email: user.email,
        otp: otp,
        expiresAt: otpExpires,
        createdAt: new Date(),
      });

      // Send OTP via email
      const emailResult = await sendOTPEmail(email, otp, user.name);

      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to send OTP email. Please try again.",
        });
      }

      // Generate temporary token for OTP verification
      const tempToken = jwt.sign(
        {
          email: user.email,
          userId: user._id.toString(),
          purpose: "otp_verification",
        },
        process.env.JWT_SECRET,
        { expiresIn: "10m" } // 10 minutes validity
      );

      res.json({
        success: true,
        message: "OTP sent to your email. Please verify to complete login.",
        tempToken: tempToken,
      });
    });

    // User Login - Step 2: Verify OTP and get access token
    app.post("/api/v1/verify-otp", async (req, res) => {
      const { tempToken, otp } = req.body;

      if (!tempToken || !otp) {
        return res.status(400).json({
          success: false,
          message: "Temporary token and OTP are required",
        });
      }

      try {
        // Verify temporary token
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);

        // Check if token is for OTP verification
        if (decoded.purpose !== "otp_verification") {
          return res.status(401).json({
            success: false,
            message: "Invalid token purpose",
          });
        }

        // Find OTP record
        const otpRecord = await otpCollection.findOne({
          userId: decoded.userId,
          email: decoded.email,
          otp: otp,
        });

        if (!otpRecord) {
          return res.status(401).json({
            success: false,
            message: "Invalid OTP",
          });
        }

        // Check if OTP is expired
        if (new Date() > new Date(otpRecord.expiresAt)) {
          await otpCollection.deleteOne({ _id: otpRecord._id });
          return res.status(401).json({
            success: false,
            message: "OTP has expired. Please request a new one.",
          });
        }

        // Get user details
        const user = await collection.findOne({
          _id: new ObjectId(decoded.userId),
        });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        // Delete used OTP
        await otpCollection.deleteOne({ _id: otpRecord._id });

        // Generate JWT access token
        const token = jwt.sign(
          { email: user.email, name: user.name, role: user.role },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.EXPIRES_IN,
          }
        );

        res.json({
          success: true,
          message: "Login successful",
          token,
        });
      } catch (error) {
        // Handle token verification errors
        if (error.name === "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            message: "Temporary token has expired. Please login again.",
          });
        } else if (error.name === "JsonWebTokenError") {
          return res.status(401).json({
            success: false,
            message: "Invalid temporary token",
          });
        }

        return res.status(500).json({
          success: false,
          message: "Token verification failed",
        });
      }
    });

    // Resend OTP endpoint
    app.post("/api/v1/resend-otp", async (req, res) => {
      const { tempToken } = req.body;

      if (!tempToken) {
        return res.status(400).json({
          success: false,
          message: "Temporary token is required",
        });
      }

      try {
        // Verify temporary token
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);

        // Check if token is for OTP verification
        if (decoded.purpose !== "otp_verification") {
          return res.status(401).json({
            success: false,
            message: "Invalid token purpose",
          });
        }

        // Get user details
        const user = await collection.findOne({
          _id: new ObjectId(decoded.userId),
        });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        // Delete old OTP and insert new one
        await otpCollection.deleteMany({ userId: decoded.userId });
        await otpCollection.insertOne({
          userId: decoded.userId,
          email: user.email,
          otp: otp,
          expiresAt: otpExpires,
          createdAt: new Date(),
        });

        // Send OTP via email
        const emailResult = await sendOTPEmail(user.email, otp, user.name);

        if (!emailResult.success) {
          return res.status(500).json({
            success: false,
            message: "Failed to send OTP email",
          });
        }

        // Generate new temporary token with extended expiry
        const newTempToken = jwt.sign(
          {
            email: user.email,
            userId: user._id.toString(),
            purpose: "otp_verification",
          },
          process.env.JWT_SECRET,
          { expiresIn: "10m" }
        );

        res.json({
          success: true,
          message: "New OTP sent to your email",
          tempToken: newTempToken,
        });
      } catch (error) {
        if (error.name === "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            message: "Session expired. Please login again.",
          });
        } else if (error.name === "JsonWebTokenError") {
          return res.status(401).json({
            success: false,
            message: "Invalid temporary token",
          });
        }

        return res.status(500).json({
          success: false,
          message: "Failed to resend OTP",
        });
      }
    });

    // ================== ORDERS CRUD API ==================

    // CREATE - POST endpoint to create a new order
    app.post("/api/v1/orders", async (req, res) => {
      try {
        const { name, email, phone, district, insideDhaka, address, quantity } =
          req.body;

        // Validation
        if (
          !name ||
          !phone ||
          !district ||
          insideDhaka === undefined ||
          !address ||
          !quantity
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Name, phone, district, insideDhaka, address, and quantity are required",
          });
        }

        // Validate quantity
        if (quantity <= 0) {
          return res.status(400).json({
            success: false,
            message: "Quantity must be greater than 0",
          });
        }

        // Create order object
        const newOrder = {
          name,
          email: email || null,
          phone,
          district,
          insideDhaka: Boolean(insideDhaka),
          address,
          quantity: Number(quantity),
          status: "pending", // Default status
          orderDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Insert into database
        const result = await ordersCollection.insertOne(newOrder);

        res.status(201).json({
          success: true,
          message: "Order created successfully",
          data: {
            orderId: result.insertedId,
            ...newOrder,
          },
        });
      } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
          success: false,
          message: "Failed to create order",
          error: error.message,
        });
      }
    });

    // UPDATE - PATCH endpoint to update order status
    app.patch("/api/v1/orders/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid order ID",
          });
        }

        // Validate status
        const validStatuses = ["pending", "approved", "declined"];
        if (!status || !validStatuses.includes(status.toLowerCase())) {
          return res.status(400).json({
            success: false,
            message: `Status must be one of: ${validStatuses.join(", ")}`,
          });
        }

        // Update order
        const result = await ordersCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: status.toLowerCase(),
              updatedAt: new Date(),
            },
          },
          { returnDocument: "after" }
        );

        if (!result) {
          return res.status(404).json({
            success: false,
            message: "Order not found",
          });
        }

        res.json({
          success: true,
          message: "Order status updated successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update order",
          error: error.message,
        });
      }
    });

    // READ - GET endpoint with pagination, filtering, sorting, and search
    app.get("/api/v1/orders", async (req, res) => {
      try {
        // Extract query parameters
        const {
          page = 1,
          limit = 10,
          status,
          insideDhaka,
          orderDate,
          search,
          sortBy = "orderDate",
          sortOrder = "desc",
        } = req.query;

        // Parse pagination parameters
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build filter object
        const filter = {};

        // Filter by status
        if (status) {
          filter.status = status.toLowerCase();
        }

        // Filter by insideDhaka
        if (insideDhaka !== undefined) {
          filter.insideDhaka = insideDhaka === "true";
        }

        // Filter by order date (exact date match)
        if (orderDate) {
          const startDate = new Date(orderDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(orderDate);
          endDate.setHours(23, 59, 59, 999);

          filter.orderDate = {
            $gte: startDate,
            $lte: endDate,
          };
        }

        // Search by name, phone, or email
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ];
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;

        // Get total count for pagination
        const totalOrders = await ordersCollection.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limitNum);

        // Fetch orders with pagination and filters
        const orders = await ordersCollection
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .toArray();

        res.json({
          success: true,
          data: orders,
          pagination: {
            currentPage: pageNum,
            totalPages: totalPages,
            totalOrders: totalOrders,
            limit: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
        });
      } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch orders",
          error: error.message,
        });
      }
    });

    // READ - GET single order by ID
    app.get("/api/v1/orders/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid order ID",
          });
        }

        // Find order
        const order = await ordersCollection.findOne({ _id: new ObjectId(id) });

        if (!order) {
          return res.status(404).json({
            success: false,
            message: "Order not found",
          });
        }

        res.json({
          success: true,
          data: order,
        });
      } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch order",
          error: error.message,
        });
      }
    });

    // DELETE - DELETE endpoint to remove an order
    app.delete("/api/v1/orders/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid order ID",
          });
        }

        // Delete order
        const result = await ordersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Order not found",
          });
        }

        res.json({
          success: true,
          message: "Order deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({
          success: false,
          message: "Failed to delete order",
          error: error.message,
        });
      }
    });

    // GET Statistics endpoint (bonus)
    app.get("/api/v1/orders/stats/summary", async (req, res) => {
      try {
        const totalOrders = await ordersCollection.countDocuments();
        const pendingOrders = await ordersCollection.countDocuments({
          status: "pending",
        });
        const approvedOrders = await ordersCollection.countDocuments({
          status: "approved",
        });
        const declinedOrders = await ordersCollection.countDocuments({
          status: "declined",
        });
        const insideDhakaOrders = await ordersCollection.countDocuments({
          insideDhaka: true,
        });
        const outsideDhakaOrders = await ordersCollection.countDocuments({
          insideDhaka: false,
        });

        // Calculate total quantity
        const quantityResult = await ordersCollection
          .aggregate([
            {
              $group: {
                _id: null,
                totalQuantity: { $sum: "$quantity" },
              },
            },
          ])
          .toArray();

        res.json({
          success: true,
          data: {
            totalOrders,
            pendingOrders,
            approvedOrders,
            declinedOrders,
            insideDhakaOrders,
            outsideDhakaOrders,
            totalQuantity: quantityResult[0]?.totalQuantity || 0,
          },
        });
      } catch (error) {
        console.error("Error fetching statistics:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch statistics",
          error: error.message,
        });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "maggot server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
