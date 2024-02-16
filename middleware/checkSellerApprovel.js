const Seller = require('../models/sellerSchema');

const checkSellerApproval = async (req, res, next) => { 
    try {
        const sellerId =await req.id; // Assuming seller ID is provided in the request body

        // Fetch the seller by ID
        const seller = await Seller.findById(sellerId);

        // Check if the seller is approved
        if (!seller || !seller.isApproved) {
            return res.status(403).json({ error: 'Seller account is not approved yet. Contact support for assistance.' });
        }

        next(); // Continue to the next middleware or route handler
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = checkSellerApproval;
