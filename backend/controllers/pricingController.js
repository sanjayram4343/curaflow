import Pricing from '../models/Pricing.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all pricing configs
// @route   GET /api/pricing
// @access  Private
export const getPricingConfig = async (req, res, next) => {
  try {
    const pricing = await Pricing.find().sort({ category: 1, name: 1 });
    res.json(pricing);
  } catch (error) {
    next(error);
  }
};

// @desc    Update single pricing item
// @route   PUT /api/pricing/:key
// @access  Private (Admin only)
export const updatePricingItem = async (req, res, next) => {
  const { price } = req.body;

  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Hospital Admin') {
      res.status(403);
      throw new Error('Not authorized to change pricing list');
    }

    const pricingItem = await Pricing.findOne({ key: req.params.key });
    if (!pricingItem) {
      res.status(404);
      throw new Error('Pricing key not found');
    }

    pricingItem.price = Number(price);
    await pricingItem.save();

    await logActivity(
      req.user._id, 
      'Pricing Updated', 
      `Updated pricing for ${pricingItem.name} to ₹${price}`, 
      req
    );

    res.json(pricingItem);
  } catch (error) {
    next(error);
  }
};
