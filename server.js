const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const fetch = require("node-fetch"); // ✅ ADD THIS

// 👉 ADD THIS HERE
const mongoose = require("mongoose");


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

const OrderSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  address: String,
  amount: Number,
  payment_id: String,
  products: Array,
  status: { type: String, default: "Pending" }
}, { timestamps: true });

const Order = mongoose.model("Order", OrderSchema);

const app = express();
app.use(cors());
app.use(bodyParser.json());


// 📧 EMAIL SETUP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "purejoycookies@gmail.com",      // 🔁 replace
    pass: "eouaxxrowpbiaqct"         // 🔁 replace (no spaces)
  }
});

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend working ✅");
});

// 📦 SAVE ORDER
app.post("/save-order", async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();

    console.log("✅ Order saved in MongoDB");

    // =========================
    // 📧 EMAIL
    // =========================
    let productHTML = "";

    (order.products || []).forEach(p => {
      productHTML += `
        <tr>
          <td>${p.name}</td>
          <td>${p.qty}</td>
          <td>₹${p.price}</td>
        </tr>
      `;
    });

    await transporter.sendMail({
      from: "Pure Joy Cookies <purejoycookies@gmail.com>",
      to: order.email,
      subject: "Order Confirmed 🍪",
      html: `
        <h2>Hi ${order.name},</h2>
        <p>Your order has been placed successfully 🎉</p>

        <h3>Order Details:</h3>
        <table border="1" cellpadding="10">
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
          </tr>
          ${productHTML}
        </table>

        <p><b>Total Amount:</b> ₹${order.amount}</p>
        <p><b>Address:</b> ${order.address}</p>

        <br/>
        <p>🍪 Pure Joy Cookies</p>
      `
    });

    console.log("📧 Email sent");

    // =========================
    // 📲 WHATSAPP
    // =========================
    let productText = "";

    (order.products || []).forEach(p => {
      productText += `${p.name} x${p.qty}\n`;
    });

    const message = `🍪 New Order
Name: ${order.name}
Phone: ${order.phone}
Amount: ₹${order.amount}

Products:
${productText}

Address: ${order.address}`;

    const phone = "919509943427";
    const apikey = "YOUR_API_KEY";

    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apikey}`;

    try {
      await fetch(url);
      console.log("📲 WhatsApp sent");
    } catch {
      console.log("⚠️ WhatsApp skipped");
    }

    // ✅ SEND RESPONSE ONLY ONCE (END)
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Save error:", err);
    res.status(500).json({ success: false });
  }
});

// 📊 VIEW ORDERS
app.get("/orders", async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});
// ============================
// ✅ UPDATE ORDER STATUS
// ============================
app.post("/update-status", async (req, res) => {
  const { id } = req.body;

  await Order.findByIdAndUpdate(id, { status: "Delivered" });

  res.json({ success: true });
});

// ============================
// ❌ DELETE ORDER
// ============================
app.post("/delete-order", async (req, res) => {
  const { id } = req.body;

  await Order.findByIdAndDelete(id);

  res.json({ success: true });
});

// 🚀 START SERVER
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});