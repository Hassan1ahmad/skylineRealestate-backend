const mongoose = require('mongoose');
const { Schema } = mongoose;

const sellerSchema = new Schema({
    username: {
        type: String,
    },
    profilePhoto: {
        url: {
            type: String,
        },
        name: {
            type: String,
        }
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    isApproved: {
        type: Boolean,
        default: false 
    },
    dateJoined: {
        type: Date,
        default: Date.now 
    },
    userType: {
        type: String,
        enum: ['House Owner', 'Real Estate Agent'],
    },
    phoneNumber: {
        type: String
    },
    homeAddress: {
        type: String
    },
});

module.exports = mongoose.model('seller', sellerSchema);
