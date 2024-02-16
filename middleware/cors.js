const express = require('express');


const cors= (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000'); // '*' allows any origin, replace with your specific domain in production
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
};

module.exports= cors