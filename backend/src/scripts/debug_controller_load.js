try {
    console.log("Attempting to require documentController...");
    const DocumentController = require("../controllers/documentController");
    console.log("Successfully required documentController.");
    console.log("Type:", typeof DocumentController);
    console.log("Keys:", Object.keys(DocumentController));
    
    if (DocumentController.getAll) {
        console.log("✅ getAll exists and is a " + typeof DocumentController.getAll);
    } else {
        console.error("❌ getAll is MISSING!");
    }

    // Check imports within the controller
    console.log("Attempting to require Document model...");
    const Document = require("../models/Document");
    console.log("Successfully required Document model.");
    
} catch (error) {
    console.error("❌ Failed to load:", error);
}
