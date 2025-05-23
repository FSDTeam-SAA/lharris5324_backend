import mongoose, { Schema } from "mongoose";

const planSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    subTitle: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true
    },
    pack: {
        type: String,
        required: true,
        enum: ["weekly", "monthly", "daily", "per-patrol"]
    },
    type: {
        type: String,
        required: true,
        enum: ["flexible", "tiered"]
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    addsOnServices: [{
        type: Schema.Types.ObjectId,
        ref: "AddsOnService"
    }]
}, { timestamps: true });

export const Plan = mongoose.model("Plan", planSchema);