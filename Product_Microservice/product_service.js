const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. Connect to MongoDB Atlas Cloud Database
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/product_db';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Product Service successfully connected to MongoDB'))
  .catch(err => console.error('Database connection error:', err));

// 2. Product Schema match your assignment specifications
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  supplierId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', ProductSchema);

// 3. API Routes

// POST /addproduct - Add a new product to the collection [cite: 366]
app.post('/addproduct', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ message: 'Product created successfully!', product: newProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /searchproduct - View all or filter products dynamically by name string [cite: 367]
app.get('/searchproduct', async (req, res) => {
  try {
    const { name } = req.query;
    // If a search name is provided, search using a case-insensitive regular expression
    const queryFilter = name ? { name: new RegExp(name, 'i') } : {};
    const products = await Product.find(queryFilter);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /deleteproduct/:id - Remove a single product utilizing its document ID parameter [cite: 368]
app.delete('/deleteproduct/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted successfully', product: deletedProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run this service on your designated Port 4001 [cite: 363]
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Product Service is up and listening on port ${PORT}`));