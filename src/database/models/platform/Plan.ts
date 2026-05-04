import mongoose, { Schema, Document } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IPlan extends Document {
    name: string;
    nameAr: string;
    price: number;
    billingCycle: 'monthly' | 'yearly';
    features: string[];
    maxUsers: number;
    isActive: boolean;
    sortOrder: number;
}

const planSchema = new Schema<IPlan>({
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    price: { type: Number, required: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    features: [{ type: String }],
    maxUsers: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

planSchema.plugin(responsePlugin);

export default mongoose.model<IPlan>('Plan', planSchema);
