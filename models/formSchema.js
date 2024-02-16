const mongoose = require('mongoose');

// Define schema for both forms
const formSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  number: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  // Checkbox for Form 1 only
  consent: {
    type: Boolean,
    required: function() {
      // Required only for Form 1
      return this.__formType === 'Form1';
    }
  },
  // Store form type to differentiate
  __formType: {
    type: String,
    enum: ['Form1', 'Form2'],
    required: true
  }
}, { timestamps: true });

// Create model
const Form = mongoose.model('Form', formSchema);

module.exports = Form;
