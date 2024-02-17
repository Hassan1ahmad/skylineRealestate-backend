const express = require('express');
const router = express.Router();
const Buyer = require('../models/buyerSchema')
const bcrypt = require('bcryptjs')
const {body,validationResult} = require('express-validator')
var jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/verifyToken');
const cors = require('../middleware/cors');
require('dotenv').config();

const jwtKey = process.env.JWT_KEY;



const expirationDate = new Date();
expirationDate.setDate(expirationDate.getDate() + 15);



// =================================Buyer SignUp using: /api/buyers/signUp.========================

router.post('/signUp',cors,[
                                    // validaton starts here
    // ========Validation for username========
    body('username').isLength({ min: 4, max: 20 }).withMessage('Username must be between 4 and 20 characters')
    .isAlpha().withMessage('Username can only contain letters'),

    // ========Validation for email========
    body('email').isEmail().withMessage('Not a valid e-mail address').custom(async value => {
        const repeatedemail = await Buyer.findOne({email:value});
        if (repeatedemail) { throw new Error('E-mail already in use'); } }),

        // ========Validation for password========
    body('password').isLength({min : 5}).withMessage('please write message with more than 5 length'),

        // ========Validation for passwordconfirmation========
    body('passwordConfirmation').custom((value, { req }) => {
        if( value !== req.body.password){
            throw new Error('Password confirmation does not match');
        }
        return true 
      })
                                          // validaton ends here

    
   ],async(req,res)=>{
    // Errors if valiadation failed
     const errors= validationResult(req)
     if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array().map(error => error.msg)})
     }

     try {
        //  salt,hash for passwords
     const salt = await bcrypt.genSalt(10)
     const hashedpassword = await bcrypt.hash(req.body.password,salt)

    //  creating  user
    const buyer = await Buyer.create({
        username: req.body.username,
        email: req.body.email,
        password: hashedpassword
     })

      //    jwt token
      const Id =await buyer.id
      const buyerAuthToken = jwt.sign({Id},jwtKey)  
      //        setting up the cookie
      res.cookie('token', buyerAuthToken, { httpOnly: false, secure: true, sameSite: 'Strict', maxAge: 1296000000 });
      res.status(201).json({success:true});

    } catch (error) {
        res.status(500).json({ success:false,error: 'Internal server error' })
     }
});

// =================================Buyer login using: /api/buyers/logIn.========================

    router.post('/logIn',[
        body('email').isEmail().withMessage('Not a valid e-mail address'),
        body('password').exists().withMessage(`Can't be empty`)     
    ],async(req,res)=>{
        // validation error
      const errors =  validationResult(req)
      if(!errors.isEmpty()){
       return res.status(400).json({errors:errors.array().map(error => error.msg)})
      }

      try {
         //   finding email
      const { email , password} = req.body
      const buyerEmail = await Buyer.findOne({email})
      if(!buyerEmail){
        return res.status(400).json({error:'Incorrect Email or Password '})
      }
    // comparing password
      const comparePassword=await bcrypt.compare(password,buyerEmail.password)
      if(!comparePassword){
        return res.status(400).json({error:'Incorrect Email or Password'});
      }
    //   creating jwt token
     const Id = buyerEmail.id
     const buyerAuthToken = jwt.sign({Id},jwtKey)
    //   setting it as cookies
     res.cookie('token', buyerAuthToken, { httpOnly: false, secure: true, sameSite: 'Strict', maxAge: 1296000000 });
     res.status(200).json({success:true})
      } catch (error) {
        res.status(500).json({ success:false,error: 'Internal server error' })
      }
    })
   
    // =================================feteching buyer detail after verifying toke : /api/buyers/buyerdetails.========================
    
    router.get('/buyerDetails',verifyToken,async(req,res)=>{
        const buyerId =await req.Id
        try {
        const buyerDetails =await Buyer.findById(buyerId).select('-password -_id -__v')
        res.json({buyerDetails})
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' })
        }
        
    })

     // =================================adding liked listing : /api/buyers/addLikedListing.========================

     router.post('/addLikedListing',[
        body('addLikedListing').isLength({max : 5}).withMessage('invalid listing')
     ],verifyToken,async(req,res)=>{
              // validation errors
        const errors =validationResult(req)
        if(!errors.isEmpty()){
            return res.status(400).json({errors:errors.array().map(error => error.msg)})
        }
                // if id is not present send error
        const buyerId = await req.Id
        if (!buyerId) {
            return res.status(400).json('Unauthorized')
        }
        // try/catch
     try {
                // removing liked listing
        updatedListing= await Buyer.findByIdAndUpdate(
            buyerId,
            {$push:{likedListings :req.body.addLikedListing}},
            {new:true}
        )
        res.status(201).json('listing liked')
     } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
     }   
         
     })

      // =================================remove liked listing : /api/buyers/removeLikedListing.========================

      router.post('/removeLikedListing',[
        body('removeLikedListing').isLength({max : 8}).withMessage('invalid listing')
      ],verifyToken,async(req,res)=>{
        // validation errors
        const errors =validationResult(req)
        if(!errors.isEmpty()){
            return res.status(400).json({errors:errors.array().map(error => error.msg)})
        }
        // if id is not present send error
           const buyerId = await req.Id
           if (!buyerId) {
            return res.status(400).json('Unauthorized')
        }
        // try/catch 
        try {
          // removing liked listing
            updatedListing= await Buyer.findByIdAndUpdate(
                buyerId,
                {$pull:{likedListings:req.body.removeLikedListing}},
                {new:true}
               )
               res.status(200).json('removed')
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });

        }
           
      })


module.exports = router