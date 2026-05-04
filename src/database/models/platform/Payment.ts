import mongoose, { Schema, Document } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IPayment extends Document {
    station: mongoose.Types.ObjectId;
    subscription: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    method: 'manual' | 'bank_transfer' | 'online';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    reference?: string;
    notes?: string;
    processedBy?: mongoose.Types.ObjectId;
    processedAt?: Date;
}

const paymentSchema = new Schema<IPayment>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'EGP' },
    method: {
        type: String,
        enum: ['manual', 'bank_transfer', 'online'],
        default: 'manual'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    reference: { type: String },
    notes: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    processedAt: { type: Date },
}, { timestamps: true });

paymentSchema.index({ station: 1, status: 1 });
paymentSchema.plugin(responsePlugin);

export default mongoose.model<IPayment>('Payment', paymentSchema);
