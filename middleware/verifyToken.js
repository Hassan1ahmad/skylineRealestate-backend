const jwt = require('jsonwebtoken');
require('dotenv').config();


const jwtKey = process.env.JWT_KEY;

const verifyToken =(req,res,next)=>{
    const token= req.cookies.token
    if(!token){
        return res.status(400).json({error:"unUnauthorized: No token provided"})
    }
    try {
        const verify= jwt.verify(token,jwtKey)
        req.Id= verify.Id

    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    next()
}

module.exports = verifyToken