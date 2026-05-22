const mongoose = require('mongoose');

/**
 * 🗄️ GenericData Model
 * Genel amaçlı key-value store - eski croxydb uyumluluğu için
 * Tüm bot ayarları, ticket verileri, çekiliş verileri vb. burada saklanır
 */
const genericDataSchema = new mongoose.Schema({
    key: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    value: { 
        type: mongoose.Schema.Types.Mixed, 
        required: true 
    },
    collection: { 
        type: String, 
        default: 'general',
        index: true 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { 
    timestamps: true,
    minimize: false // Boş objeleri de kaydet
});

// Compound index for collection-based queries
genericDataSchema.index({ collection: 1, key: 1 });

module.exports = mongoose.models.GenericData || mongoose.model('GenericData', genericDataSchema);
