import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFinancialSafe extends Document {
    station: Types.ObjectId;
    date: string;
    openingBalance: number;
    closingBalance: number;
    netCashFlow: number; // Sum of all IN - OUT for that day
    actualCashCounted: number; // Physical cash in safe
    shortageOrExtra: number; // actualCashCounted - closingBalance
}

const financialSafeSchema = new Schema<IFinancialSafe>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    openingBalance: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
    netCashFlow: { type: Number, default: 0 },
    actualCashCounted: { type: Number, default: 0 },
    shortageOrExtra: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IFinancialSafe>('FinancialSafe', financialSafeSchema);
