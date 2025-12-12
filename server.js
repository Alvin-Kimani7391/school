// ---------------- server.js ----------------
require("dotenv").config(); // Load .env variables

console.log("MONGO_URI =", process.env.MONGO_URI);



const express = require("express");

const cors = require("cors");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "adminpass", 8);



// ---------------- MONGODB CONNECTION ----------------
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI is not set in environment variables");
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  // these options are optional for newer Mongoose versions
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));



// ---------------- MONGOOSE SCHEMAS ----------------
const orderSchema = new mongoose.Schema({
  schoolName: String,
  className: String,
  regNumber: String,
  studentName: String,
  cart: Array,
  buyerPhone: String,
  buyerEmail: String,
  timestamp: { type: Date, default: Date.now }
});

const Order = mongoose.model("Order", orderSchema);

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// ---------------- AUTH ----------------
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing auth header" });

  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ error: "Invalid auth format" });

  try {
    const decoded = jwt.verify(parts[1], JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------------- ADMIN LOGIN ----------------
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH))
    return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ success: true, token });
});

// ---------------- SAVE ORDER ----------------
app.post("/save-order", async (req, res) => {
  try {
    const {
      schoolName,
      className,
      regNumber,
      studentName,
      cart,
      buyerPhone,
      buyerEmail
    } = req.body;

    if (!schoolName || !className || !regNumber)
      return res.status(400).json({ error: "Missing required fields." });

    const order = new Order({
      schoolName,
      className,
      regNumber,
      studentName,
      cart,
      buyerPhone,
      buyerEmail
    });

    await order.save();
    res.json({ success: true, message: "Order saved." });

  } catch (err) {
    console.error("save-order error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------- GET ALL ORDERS ----------------
app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().lean();
    const grouped = {};

    orders.forEach(o => {
      const school = o.schoolName || "Unknown School";
      const cls = o.className || "Unknown Class";

      if (!grouped[school]) grouped[school] = {};
      if (!grouped[school][cls]) grouped[school][cls] = [];
      grouped[school][cls].push(o);
    });

    res.json({ success: true, data: grouped });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ---------------- PDF DOWNLOAD ----------------
app.get("/api/download/pdf", authMiddleware, async (req, res) => {
  try {
    const { school, class: className, reg } = req.query;

    if (!school) return res.status(400).json({ error: "Missing school param" });

    let query = { schoolName: school };
    if (className && className.toLowerCase() !== "all") query.className = className;
    if (reg) query.regNumber = reg;

    const students = await Order.find(query).lean();
    if (students.length === 0) return res.status(404).json({ error: "No students found" });

    const doc = new PDFDocument({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="orders.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold")
      .text(`${school} — ${className || "All Classes"}`, { align: "center" });
    doc.moveDown(1);

    const colWidths = { no: 35, name: 130, reg: 80, form: 70, items: 140, price: 70, tick: 30 };
    const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
    const startX = (doc.page.width - totalWidth) / 2;

    // HEADER
    doc.fontSize(12).font("Helvetica-Bold");
    let headerY = doc.y;
    doc.text("NO.", startX, headerY, { width: colWidths.no });
    doc.text("STUDENT NAME", startX + colWidths.no, headerY, { width: colWidths.name });
    doc.text("REG NO", startX + colWidths.no + colWidths.name, headerY, { width: colWidths.reg });
    doc.text("FORM", startX + colWidths.no + colWidths.name + colWidths.reg, headerY, { width: colWidths.form });
    doc.text("ITEMS ORDERED", startX + colWidths.no + colWidths.name + colWidths.reg + colWidths.form, headerY, { width: colWidths.items });
    doc.text("PRICE", startX + colWidths.no + colWidths.name + colWidths.reg + colWidths.form + colWidths.items, headerY, { width: colWidths.price });
    doc.moveDown(0.5).moveTo(startX, doc.y).lineTo(startX + totalWidth, doc.y).stroke();
    doc.moveDown(0.4);

    doc.font("Helvetica").fontSize(10);
    let rowY = doc.y;
    const rowHeight = 22;
    let count = 1;

    students.forEach(stu => {
      const itemsList = (stu.cart || []).map(it => `${it.make} ${it.model}`.trim()).join(", ");
      const totalPrice = (stu.cart || []).reduce((s, it) => s + (Number(it.price) || 0), 0);

      // PAGE BREAK
      if (rowY + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        headerY = doc.y;
        doc.fontSize(12).font("Helvetica-Bold");
        doc.text("NO.", startX, headerY, { width: colWidths.no });
        doc.text("STUDENT NAME", startX + colWidths.no, headerY, { width: colWidths.name });
        doc.text("REG NO", startX + colWidths.no + colWidths.name, headerY, { width: colWidths.reg });
        doc.text("FORM", startX + colWidths.no + colWidths.name + colWidths.reg, headerY, { width: colWidths.form });
        doc.text("ITEMS ORDERED", startX + colWidths.no + colWidths.name + colWidths.reg + colWidths.form, headerY, { width: colWidths.items });
        doc.text("PRICE", startX + colWidths.no + colWidths.name + colWidths.reg + colWidths.form + colWidths.items, headerY, { width: colWidths.price });
        doc.moveDown(0.5).moveTo(startX, doc.y).lineTo(startX + totalWidth, doc.y).stroke();
        doc.moveDown(0.4);
        doc.font("Helvetica").fontSize(10);
        rowY = doc.y;
      }

      let x = startX;
      Object.values(colWidths).forEach(width => {
        doc.rect(x, rowY, width, rowHeight).stroke();
        x += width;
      });

      const yOff = 6;
      x = startX;
      doc.text(`${count}.`, x + 4, rowY + yOff, { width: colWidths.no - 8 }); x += colWidths.no;
      doc.text(stu.studentName || "-", x + 4, rowY + yOff, { width: colWidths.name - 8 }); x += colWidths.name;
      doc.text(stu.regNumber || "-", x + 4, rowY + yOff, { width: colWidths.reg - 8 }); x += colWidths.reg;
      doc.text(stu.className || "-", x + 4, rowY + yOff, { width: colWidths.form - 8 }); x += colWidths.form;
      doc.text(itemsList || "-", x + 4, rowY + yOff, { width: colWidths.items - 8 }); x += colWidths.items;
      doc.text(`Ksh.${totalPrice}`, x + 4, rowY + yOff, { width: colWidths.price - 8 }); x += colWidths.price;
      rowY += rowHeight;
      count++;
    });

    doc.end();
  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).json({ error: "Could not create PDF" });
  }
});

// ---------------- EXCEL DOWNLOAD ----------------
app.get("/api/download/excel", authMiddleware, async (req, res) => {
  try {
    const { school, class: className } = req.query;
    if (!school) return res.status(400).send("Missing school query param");

    let query = { schoolName: school };
    if (className && className.toLowerCase() !== "all") query.className = className;

    const students = await Order.find(query).lean();
    if (students.length === 0) return res.status(404).send("No students found");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Orders");

    sheet.columns = [
      { header: "REG NO", key: "reg", width: 15 },
      { header: "STUDENT NAME", key: "student", width: 30 },
      { header: "FORM", key: "form", width: 15 },
      { header: "ITEMS ORDERED", key: "items", width: 50 },
      { header: "PRICE", key: "price", width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };

    students.forEach(stu => {
      const itemsList = (stu.cart || []).map(it => `${it.make} ${it.model}`.trim()).join(", ") || "-";
      const totalPrice = (stu.cart || []).reduce((sum, it) => sum + (Number(it.price) || 0), 0);

      sheet.addRow({
        reg: stu.regNumber,
        student: stu.studentName,
        form: stu.className,
        items: itemsList,
        price: totalPrice
      });
    });

    const fileName = className ? `${school}-${className}.xlsx` : `${school}-all.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Excel error:", err);
    res.status(500).send("Could not create Excel file");
  }
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin login: ${ADMIN_USERNAME}`);
});
