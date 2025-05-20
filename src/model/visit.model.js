import mongoose, { Schema } from "mongoose";

const visitSchema = new Schema({
    visitId: {
        type: String,
        unique: true,
        trim: true,
        immutable: true,
    },
    client: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    staff: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    address: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
    },
    status: {
        type: String,
        enum: ["completed", "cancelled", "confirmed", "pending"],
        default: 'pending'
    },
    cancellationReason: {
        type: String,
        trim: true,
        default: ''
    },
    type: {
        type: String,
        enum: ['routine check', "emergency", 'follow up']
    },
    notes: {
        type: String,
        trim: true,
        default: ""
    },
    issues: [{
        place: {
            type: String,
            trim: true
        },
        issue: {
            type: String,
            trim: true
        },
        issueDate: {
            type: Date,
            default: Date.now
        },
        type: {
            type: String,
        },
        media: [{
            type: {
                type: String,
                enum: ["photo", "video"]
            },
            url: {
                type: String,
                trim: true
            }
        }],
        notes: {
            type: String,
            trim: true
        }
    }],
    isPaid: {
        type: Boolean,
        default: false
    },
    plan: {
        type: Schema.Types.ObjectId,
        ref: 'Plan',
    },
    addsOnService: {
        type: Schema.Types.ObjectId,
        ref: 'AddsOnService'
    },
    userPlan: {
        type: Schema.Types.ObjectId,
        ref: 'UserPlan',
    },

}, { timestamps: true })

visitSchema.index({ status: 1, date: 1 });


// Pre-save hook to generate visitId only for new documents
visitSchema.pre('save', async function (next) {
    if (this.isNew && !this.visitId) {
        let isUnique = false;
        let generatedId;

        while (!isUnique) {
            // Generate 3-digit random number (100-999)
            generatedId = Math.floor(100 + Math.random() * 900).toString();

            // Check for existing visit with this ID
            const existingVisit = await this.constructor.findOne({ visitId: generatedId });
            if (!existingVisit) {
                isUnique = true;
            }
        }

        this.visitId = generatedId;
    }
    next();
});

visitSchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
    const update = this.getUpdate();

    if (update.visitId) {
        delete update.visitId;
        delete update.$set?.visitId;
    }
    next();
});

export const Visit = mongoose.model("Visit", visitSchema);