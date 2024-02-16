const connectToMongoose = require('./db');
const cookieParser = require('cookie-parser');
const express = require('express');
const cors = require('cors');
require('dotenv').config(); 


connectToMongoose(); 
const app = express();
const port = process.env.PORT || 5000;

app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',  // Replace with the actual origin of your frontend
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
})); 
// Available routes
app.use('/api/buyers', require('./routes/buyer'));
app.use('/api/seller', require('./routes/seller'));
app.use('/api/listing', require('./routes/property'));
app.use('/api/form', require('./routes/forms'))

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});


