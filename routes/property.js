const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Property = require('../models/propertyshema');
const verifyTokenofS = require('../middleware/verifyTokenofS');
const checkSellerApproval = require('../middleware/checkSellerApprovel');
const { getStorage, ref, getDownloadURL, uploadBytesResumable,deleteObject } = require("firebase/storage");
const multer = require("multer");
const cors = require('../middleware/cors')
const { initializeApp } = require("firebase/app");
require('dotenv').config();


router.use(express.json());

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
      console.error(err);
      return res.status(400).json({ error: 'Multer Error: ' + err.message });
    } else {
      next(err); // Pass other errors to the default error handler
    }
  } 
);


// =============================add new property using: /api/listing/addproperty
router.post('/addProperty',cors,upload.array('images'),multererror,[
    // ====validation starts here
    // type
    body('type').isIn(['Apartment', 'Building', 'Chateau', 'Commercial Property', 'Country House', 'Land', 'Office', 'Parking Space or Garage', 'Storage Room', 'TownHouse','House']).withMessage('Invalid property type'),
    // name and description
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('description').isString().notEmpty().withMessage('Description is required'),
    // Custom validation for bedrooms and kitchen based on property type
   body('bedrooms').isInt({ min: 0}) .withMessage(' must be a positive integer'),
    body('kitchen').isInt({ min: 0}) .withMessage(' must be a positive integer'),
    // floor, built area ,year of contruction
    body('floor').isInt({ min: 0 }).withMessage('Floor must be a positive integer'),
    body('builtArea').isInt({ min: 1 }).withMessage('Built Area must be a positive integer'),
    body('yearOfConstruction').isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Invalid year of construction'),
    //    status 
    body('status').isIn(['For Rent', 'For Sale']).withMessage('Invalid property status'), // New validation for status field
    // location
    body('location.city').isString().notEmpty().matches(/^[a-zA-Z\s]+$/).withMessage('Invalid city name'),
    body('location.state').isString().notEmpty().matches(/^[a-zA-Z\s]+$/).withMessage('Invalid state name'),
    body('location.country').isString().notEmpty().matches(/^[a-zA-Z\s]+$/).withMessage('Invalid country name'),
    body('location.address').isString().notEmpty(),
    body('additionalFeatures').isArray().withMessage('Additional Features must be an array'),
    ],verifyTokenofS,checkSellerApproval,async(req,res)=>{
        const errors = validationResult(req)
        if(!errors.isEmpty()){
            return res.status(400).json({
                errors: errors.array().map(error => error.msg)
              });
        }
        const sellerId=await req.id 
        try {
           const dateTime = giveCurrentDateTime();
           const images=[]
           for(const file of req.files){
            const imagename = extractFirstWords(file.originalname);
            const storageRef = ref(storage, `skyline-images/${imagename}_${dateTime}`);
            // Create file metadata including the content type
            const metadata = {
                contentType: file.mimetype,
            };
            try {
                // Upload the file in the bucket storage
            const snapshot = await uploadBytesResumable(storageRef, file.buffer, metadata);
            if (snapshot.error) {
                return res.status(500).json({ error: 'Error during file upload' });
            }
                    // Grab the public url
            const downloadURL = await getDownloadURL(snapshot.ref);
            images.push({
                url: downloadURL, 
                name: `${imagename}_${dateTime}`
            });
            } catch (uploadError) {
                console.error('Error during file upload:', uploadError.message);
                return res.status(500).json({ error: 'Error during file upload' });
            }  
           }
        
        
            // Try to create the Property document
        try {
            const property = await Property.create({
                type: req.body.type,
                name: req.body.name,
                description: req.body.description,
                status: req.body.status,
                price: req.body.price,
                bedrooms: req.body.bedrooms,
                bathrooms: req.body.bathrooms,
                kitchen: req.body.kitchen,
                floor: req.body.floor,
                builtArea: req.body.builtArea,
                yearOfConstruction: req.body.yearOfConstruction,
                location: req.body.location,
                additionalFeatures: req.body.additionalFeatures,
                image: images,
                seller: sellerId
            });

            res.status(201).json({ message: `Property created successfully with id ${property.id}` });
        } catch (propertyError) {

            // If an error occurs during Property creation, delete the uploaded images from storage
            for (const image of images) {
                const storageRef = ref(storage, `skyline-images/${image.name}`);
                await deleteObject(storageRef);
            }

            return res.status(500).json({ error: 'Error during Property creation' });
        }

        } catch (error) {
            res.status(500).json({error});
        }  
    })

// =============================delete property using: /api/listing/deletePorperty/:propertyId

    router.delete('/deletePorperty/:propertyId',verifyTokenofS,cors,async(req,res)=>{
        const {propertyId} = req.params
        if(!propertyId){
            return res.status(404).json({ error: 'Property not found' });
        }
        const sellorId =await req.id
        try {
            // find prperty by id
            const property=await Property.findById(propertyId)
            if(!property){
                return res.status(404).json({ error: 'Property not found' }); 
            }
            // Check if the current user is the owner of the property (assuming seller ID is associated with the seller)
            if(property.seller.toString() !== sellorId.toString()){
                return res.status(403).json({ error: 'You do not have permission to delete this property' });
            }
             // Delete the image from Firebase Storage
             for(const image of property.image){  
                const storageRef = ref(storage, `skyline-images/${image.name}`);
                try {
                    await deleteObject(storageRef);
                } catch (deleteError) {
                    return res.status(500).json({ error: 'Error during image deletion' });
                }
             }
             await Property.findByIdAndDelete(propertyId);
            res.json({ message: `Property delete successfully with name ${property.name}` })

        } catch (error) {
            res.status(500).json({ error ,error: 'Internal Server Error' });
        }
    })

    // =============================get all properties using : /allProperties

    router.get('/allProperites',cors,async(req,res)=>{ 
        try {
            const AllProperties =await Property.find({ approvalStatus: "Approved" });
            res.json({AllProperties})
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' }); 
        }
    })
        // =============================get all seller properties using : /allProperties

        router.get('/sellerProperties',verifyTokenofS,async(req,res)=>{
            const sellerId=await req.id
            try {
                const SellerProperties = await Property.find({seller:sellerId})
                if(!SellerProperties){
                    return res.status(400).json('No properites founded')
                }
                res.status(200).json({SellerProperties})
            } catch (error) {
                res.status(500).json({ error: 'Internal Server Error' });

            }

        })

        // Route to search properties based on type, for sale/rent, and city

        router.get('/search-Properties',cors,async(req,res)=>{
            try { 
                const {type,propertyStatus,city}=req.query
                const searchquery={}
                if(type){
                    searchquery.type = type;
                }
                if (propertyStatus) {
                    searchquery.status = propertyStatus; // Updated field name
                }
                if(city){
                    searchquery['location.city'] = city
                }
                // Add approval status check
                searchquery.approvalStatus = 'Approved';

                  // Remove empty parameters from the searchquery
                Object.keys(searchquery).forEach((key) => (searchquery[key] === undefined || searchquery[key] === '') && delete searchquery[key]);

                // Check if searchquery is empty
                if (Object.keys(searchquery).length === 0) {
                    return res.status(400).json({ error: 'At least one non-empty parameter is required for the search.' });
                }


                const searchedProperties= await Property.find(searchquery)

                
        
                res.json({searchedProperties})
            } catch (error) {
                res.status(500).json({ error,error: 'Internal Server Error' });

            }
        })


module.exports=router