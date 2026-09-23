import mongoose from 'mongoose';


const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: true
    },
    shortUrl: {
        type: String,
        required: true
    },
    counter: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

export default mongoose.model('Url', urlSchema);