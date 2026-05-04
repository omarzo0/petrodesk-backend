import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IDailyTreasury extends Document {
    station: Types.ObjectId;
    date: string;
    quantity: number;
    price: number;
    money: number;
    statement: string;
}

const dailyTreasurySchema = new Schema<IDailyTreasury>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    money: { type: Number, default: 0 },
    statement: { type: String, required: true },
}, { timestamps: true });

dailyTreasurySchema.index({ date: 1, statement: 1 });
dailyTreasurySchema.plugin(responsePlugin);

export default mongoose.model<IDailyTreasury>('DailyTreasury', dailyTreasurySchema);
