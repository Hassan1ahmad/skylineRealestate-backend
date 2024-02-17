const express= require('express')
const router =express.Router()
const seller= require('../models/sellerSchema')
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verifyTokenofS = require('../middleware/verifyTokenofS');
const { getStorage, ref, getDownloadURL, uploadBytesResumable,deleteObject } = require("firebase/storage");
const multer = require("multer");
const { initializeApp } = require("firebase/app");
require('dotenv').config();


const jwtKey = process.env.JWT_KEY;

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };
  const giveCurrentDateTime = () => {
    const today = new Date();
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const dateTime = date + ' ' + time;
    return dateTime;
    }
    function extractFirstWords(imageName) {
        // Split the image name into an array of words
        const words = imageName.split('-').map(word => word.trim());

        // Select the first 5 to 7 words
        const selectedWords = words.slice(0, Math.min(7, words.length)).join(' ');

        return selectedWords;
    }

     // Initialize a firebase application
    initializeApp(firebaseConfig); 

    // Initialize Cloud Storage and get a reference to the service
    const storage = getStorage();
    // Setting up multer as a middleware to grab photo uploads
    const upload = multer({ storage: multer.memoryStorage() });
    // multer error middleware
    const multererror= ((err, req, res, next) => {
        if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Multer Error: ' + err.message });
        } else {
        next(err); // Pass other errors to the default error handler
        }
    } 
    );




// ===================signUp using :/api/seller/signUp============================
router.post('/signUp',[
    //  validation starts here
    // for userName
    body('username')
  .isLength({ min: 4, max: 20 }).withMessage('Username must be between 4 and 20 characters')
  .matches(/^[a-zA-Z\s]+$/).withMessage('Username can only contain letters and spaces'),

  //   for email
  body('email').isEmail().withMessage('Not a valid e-mail address')
  .custom(async value => {
      const repeatedemail = await seller.findOne({email:value});
      if (repeatedemail) { throw new Error('E-mail already in use'); }
  }),
//   for password
  body('password').isLength({min : 5})
  .notEmpty().withMessage('password is required'),
// for password confirmation
  body('passwordConfirmation').notEmpty().withMessage('confirmation password is required').custom((value, { req }) => {
    if( value !== req.body.password){
        throw new Error('Password confirmation does not match.');
    }
    return true;
})
//       validation ends here

],async(req,res)=>{
    // validation errors
   const errors = validationResult(req)
   if(!errors.isEmpty()){
    return res.status(400).json({
        errors: errors.array().map(error => error.msg)
      });
   }
   try {
    //    hashing password
   const salt = await bcrypt.genSalt(10)
   const hashedPassword= await bcrypt.hash(req.body.password,salt)

//    create seller
     const newseller= await seller.create({
        username: req.body.username,
        email: req.body.email,
        password:hashedPassword
    })
//   JWT token
   const Id= await newseller.id
   const sellerToken= jwt.sign({Id},jwtKey)
   res.cookie('sellerToken',sellerToken,{ httpOnly: false,  secure: true, sameSite: 'None', maxAge: 1296000000 })
    
   
   res.status(201).json({success:true})
   } catch (error) {
    res.status(500).json({error:'Internal Server Error' })
   }

})

// ===================logIn using :/api/seller/LogIn============================

    router.post('/logIn',[
        body('email').isEmail().withMessage('Not a valid e-mail address'),
        body('password').notEmpty().withMessage('password is required')
    ],async(req,res)=>{
        // validation errors
        const errors= validationResult(req)
        if(!errors.isEmpty()){
            return res.status(400).json({
                errors: errors.array().map(error => error.msg)
              });
        }
        try {
            const{ email,password} = req.body
        // find email
        const sellerEmail = await seller.findOne({email})
        if(!sellerEmail){
            return res.status(400).json({error:'incorrect details'})
        }
        // compare password
        const comparePassword= await bcrypt.compare(password,sellerEmail.password)
        if(!comparePassword){
            return res.status(400).json({error:'incorrect details'})
        }
        // JWT Token
        const Id= await sellerEmail.id
        const sellerToken= jwt.sign({Id},jwtKey)
        // setting jwt to cookie
        res.cookie('sellerToken', sellerToken, {
            httpOnly: false,
            secure: true, sameSite: 'None',
            maxAge: 1296000000
          });
        res.json({success:true})
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' })
        } 
    })

    // ===================gettig seller detail using :/api/seller/sellerDetails============================
    
    router.get('/sellerDetails',verifyTokenofS,async(req,res)=>{
        const sellerId=await req.id
        try {
            const sellerDetails = await seller.findById(sellerId).select('-password -_id -__v')
            res.json({sellerDetails})
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' })
        }
       
    })

    // ===================updaating  seller details using :/api/seller/uploadProfile============================

    router.put('/updateProfile',verifyTokenofS,upload.single('photo'), [
        body('userType').optional().isIn(['House Owner', 'Real Estate Agent']).withMessage('Invalid user type'),
        body('homeAddress').optional().isString().withMessage('Address must be a string'),
        body('phoneNumber').optional().isMobilePhone(['en-PK']).withMessage('Invalid phone number'),
    ], verifyTokenofS, async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array().map(error => error.msg) });
        }
        let downloadURL;
        let imagename;
        let dateTime;
        if(req.file){
            try {
                 imagename = extractFirstWords(req.file.originalname);
                 dateTime = giveCurrentDateTime();
                const storageRef = ref(storage, `skyline-SellerProfile-images/${imagename}_${dateTime}`);
                const metadata = {
                    contentType: req.file.mimetype,
                };
                        // Upload the file in the bucket storage
                const snapshot = await uploadBytesResumable(storageRef, req.file.buffer, metadata);
                if (snapshot.error) {
                    return res.status(500).json({ error: 'Error during file upload' });
                 }
                // Grab the public url
                downloadURL = await getDownloadURL(snapshot.ref);
                   
            } catch (uploadError) {
                return res.status(500).json({ error: 'Error during file upload' });
            }  
        }
        

        const sellerId = req.id;
     
        try {
            const sellerProfile = await seller.findById(sellerId);
            if (!sellerProfile) {
                return res.status(400).json('Seller not found');
            }
            // Check if the logged-in seller is authorized to update their profile
            if (sellerProfile._id.toString() !== sellerId) {
                return res.status(403).json({ error: "Not authorized to update this profile" });
            }

            if(req.file){
                        // If the seller already has a profile photo, delete it from Firebase Storage
        if (sellerProfile.profilePhoto.name) {
            const profilePhotoRef = ref(storage, `skyline-SellerProfile-images/${sellerProfile.profilePhoto.name}`);
            await deleteObject(profilePhotoRef);

            sellerProfile.profilePhoto = {
                url: downloadURL,
                name: `${imagename}_${dateTime}`
            };
        }
            }
         
             // Update profile details based on the request body
            if (req.body.userType) sellerProfile.userType = req.body.userType;
            if (req.body.homeAddress) sellerProfile.homeAddress = req.body.homeAddress;
            if (req.body.phoneNumber) sellerProfile.phoneNumber = req.body.phoneNumber; 

    
            await sellerProfile.save();
    
            res.status(200).json('Profile details updated');
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
            const storageRef = ref(storage, `skyline-SellerProfile-images/${imagename}_${dateTime}`);
                await deleteObject(storageRef);
        }
    });
         

module.exports= router