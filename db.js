// const mongoose = require('mongoose')
// const mongooseURL = 'mongodb://127.0.0.1/skylineRealEstate'

// const connectToMongoose=async()=>{
//     try {
//        await mongoose.connect(mongooseURL)
//         console.log('connected to mongodb')
//     } catch (error) {
//         console.log('connection failed',error.message)
//     }
// }

// module.exports = connectToMongoose

const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.DATABASE_URL; 
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

async function connectToMongoose() {
  try {
    await mongoose.connect(uri, clientOptions);
    console.log('Connected to MongoDB Atlas successfully!');
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

module.exports = connectToMongoose;

