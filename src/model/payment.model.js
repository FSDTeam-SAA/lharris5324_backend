import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visit: {
      type: Schema.Types.ObjectId,
      ref: "Visit",
      default: null,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    userPlan: {
      type: Schema.Types.ObjectId,
      ref: "UserPlan",
    },
    amount: {
      type: Number,
      required: true,
      get: (v) => parseFloat(v.toFixed(2)),
    },
    status: {
      type: String,
      enum: ["pending", "completed", "expired", "failed", "refunded"],
      default: "pending",
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["stripe"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    toJSON: {
      virtuals: true,
      getters: true,
      transform: (doc, ret) => {
        ret.formattedAmount = `$${ret.amount.toFixed(2)}`;
        return ret;
      },
    },
  }
);

// Indexes
paymentSchema.index({ user: 1 });
paymentSchema.index({ visit: 1 });
paymentSchema.index({ status: 1 });

export const Payment = mongoose.model("Payment", paymentSchema);
