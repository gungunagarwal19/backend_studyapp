function updateSM2(flashcard, quality) {
    if (quality == 1) {
        flashcard.repetitions = 0;
        flashcard.interval = 1;
    } else {
        if (flashcard.repetitions === 0) {
            flashcard.interval = 1;
        } else if (flashcard.repetitions === 1) {
            flashcard.interval = 6;
        } else {
            flashcard.interval = Math.round(flashcard.interval * flashcard.ease);
        }
        flashcard.repetitions += 1;
    }

    flashcard.ease = flashcard.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (flashcard.ease < 1.3) {
        flashcard.ease = 1.3;
    }

    flashcard.lastReviewed = new Date();
    flashcard.nextReview = new Date(Date.now() + flashcard.interval * 86400000); 

    return flashcard;
}

module.exports = updateSM2 ;
