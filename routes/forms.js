const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Form = require('../models/formSchema'); 
const { default: axios } = require('axios');
require('dotenv').config();

const SECRET_KEY = process.env.CAPTCHA_SECRET_KEY;


router.post(
  '/submitform',
  [
    // Validation rules for form fields
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Email is not valid'),
    body('number').notEmpty().withMessage('Number is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('consent').optional().isBoolean().withMessage('Consent must be a boolean'),
    body('recaptchaToken').if((value, { req }) => req.body.formType === 'Form2').notEmpty().withMessage('reCAPTCHA token is required for Form2')
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
         // Verify reCAPTCHA token only for Form2
      if (req.body.formType === 'Form2') {
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${SECRET_KEY}&response=${req.body.recaptchaToken}`);
        const { success } = response.data;
        if (!success) {
          return res.status(400).json({ message: 'reCAPTCHA verification failed' });
        }
      }
      // Extract form data from request body
      const { name, email, number, description, consent, formType } = req.body;

      // Create a new form instance based on the submitted data
      const newForm = new Form({
        name,
        email,
        number,
        description,
        consent,
        __formType: formType // Assuming you'll specify formType in the request body to indicate which form it is
      });

      // Save the form data to the database
      await newForm.save();

      res.status(201).json({ message: 'Form submitted successfully!' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to submit form. Please try again later.', error });
    }
  }
);

module.exports = router;
