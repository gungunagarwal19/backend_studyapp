const catchAsyncError = require("../../middleware/catchAsyncError");
const FlashCard = require("../Model/FlashCard")
const updateSM2 = require('../Service/updateSM2')
const ErrorHandling = require('../../utils/ErrorHandling');

const reviewCards = catchAsyncError(async (req, res, next) => {
    const { sectionId } = req.body || req.query;
    if (!sectionId) {
        return next(new ErrorHandling(400, 'sectionId is required'));
    }

    const cards = await FlashCard.find({
        sectionId,
        nextReview: { $lte: new Date() }
    }).sort({ nextReview: 1 }).limit(5);

    return res.json({
        message: 'Review session started',
        flashcards: cards
    });
});

const swipeCard = catchAsyncError(async (req, res, next) => {
    const { currentCardId, swipe, sectionId } = req.body;
    const map = {
        right: 1, // forgot
        left: 2, // sturggled
        up: 3, // hesitated
        down: 5 // perfect
    };
    const quality = map[swipe];
    if (!quality) return next(new ErrorHandling(400, 'Invalid swipe'));

    const card = await FlashCard.findById(currentCardId);
    if (!card) return next(new ErrorHandling(404, 'Card not found'));

    updateSM2(card, quality);
    await card.save();


    const dueCards = await FlashCard.find({
        sectionId,
        nextReview: { $lte: new Date() },
        _id: { $ne: currentCardId }
    }).sort({ nextReview: 1 }).limit(5);

    const nextCard = dueCards.length > 4 ? dueCards[4] : null;

    return res.json({
        message: 'Card updated',
        updatedCardId: currentCardId,
        nextCard
    });
});


const updateNext = catchAsyncError(async (req, res, next) => {
    const sectionId = req.body;

    await FlashCard.updateMany(
        sectionId, 
        { $set: { nextReview: Date.now() } } 
      );

      return res.json({
        message: "Success"
      })
})

module.exports = {reviewCards, swipeCard, updateNext};