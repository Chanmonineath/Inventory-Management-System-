const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. Connect to the Supplier Database space
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/supplier_db';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Supplier Service successfully connected to MongoDB'))
  .catch(err => console.error('Database connection error:', err));

// 2. Supplier Schema specification
const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  address: { type: String, required: true }
});
const Supplier = mongoose.model('Supplier', SupplierSchema);

// 3. API Endpoints

// POST /addsupplier
app.post('/addsupplier', async (req, res) => {
  try {
    const newSupplier = new Supplier(req.body);
    await newSupplier.save();
    res.status(201).json({ message: 'Supplier created successfully!', supplier: newSupplier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /searchsupplier
app.get('/searchsupplier', async (req, res) => {
  try {
    const { name } = req.query;
    const queryFilter = name ? { name: new RegExp(name, 'i') } : {};
    const suppliers = await Supplier.find(queryFilter);
    res.status(200).json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /deletesupplier/:id
app.delete('/deletesupplier/:id', async (req, res) => {
  try {
    const deletedSupplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!deletedSupplier) return res.status(404).json({ message: 'Supplier not found' });
    res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. RUN THIS ON PORT 4002
const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`Supplier Service is up and listening on port ${PORT}`));