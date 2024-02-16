const mongoose = require('mongoose')
const {Schema} = mongoose

const buyerSchema= new Schema ({
    username:{
        type: String,
        required : true,
    },
    email :{
        type : String,
        required : true,
        unique : true
    },
    password :{
        type: String,
        required : true,
    },
    likedListings :[{
        type: String  
    }]
    
    
})

module.exports = mongoose.model('Buyer',buyerSchema)