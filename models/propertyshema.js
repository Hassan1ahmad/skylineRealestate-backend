const mongoose = require('mongoose');
const { Schema } = mongoose;



const propertySchema = new Schema({
    seller: {
                type: Schema.Types.ObjectId,
                ref: 'seller',
                required: true
            },
    type: {
        type: String,
        enum: ['Apartment', 'Building', 'Commercial Property', 'Country House', 'Land', 'Office', 'Parking Space or Garage', 'Storage Room', 'TownHouse','House'],
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    approvalStatus:{
        type: String,
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['For Rent', 'For Sale'],
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    bedrooms: {
        type: Number,
        required: function () {
            // Bedrooms are required only for certain property types
            return ['Apartment', 'Building', 'Chateau', 'Country House', 'TownHouse'].includes(this.type);
        }
    },
    bathrooms: {
        type: Number,
        required: true
    },
    kitchen: {
        type: Number,
        required: function () {
            // Kitchen is required only for certain property types
            return ['Apartment', 'Building', 'Chateau', 'Country House', 'TownHouse'].includes(this.type);
        }
    },
    floor: {
        type: Number,
        required: true
    },
    builtArea: {
        type: Number,
        required: true
    },
    yearOfConstruction: {
        type: Number,
        required: true
    },
    location: {
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        }
    },
    additionalFeatures: [{
        type: String,
        required: true
    }],
    image: [{
        url: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    }],
    date:{
        type: String,
        default:Date.now()
    }
});

module.exports = mongoose.model('property', propertySchema);
    