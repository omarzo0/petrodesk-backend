import mongoose, { Schema, Document } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface ISubscription extends Document {
    station: mongoose.Types.ObjectId;
    plan?: mongoose.Types.ObjectId;
    status: 'trial' | 'active' | 'expired' | 'cancelled';
    trialStart: Date;
    trialEnd: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelledAt?: Date;
}

const subscriptionSchema = new Schema<ISubscription>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan' },
    status: {
        type: String,
        enum: ['trial', 'active', 'expired', 'cancelled'],
        default: 'trial'
    },
    trialStart: { type: Date, required: true },
    trialEnd: { type: Date, required: true },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelledAt: { type: Date },
}, { timestamps: true });

subscriptionSchema.index({ station: 1, status: 1 });
subscriptionSchema.plugin(responsePlugin);

export default mongoose.model<ISubscription>('Subscription', subscriptionSchema);
