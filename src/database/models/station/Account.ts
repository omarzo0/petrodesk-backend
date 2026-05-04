import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IAccount extends Document {
    station: Types.ObjectId;
    date: string;
    name: string;
    receiptName: string;
    money: number;
}

const accountSchema = new Schema<IAccount>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    name: { type: String, required: true },
    receiptName: { type: String, default: '' },
    money: { type: Number, default: 0 },
}, { timestamps: true });

accountSchema.index({ date: 1, name: 1 });
accountSchema.plugin(responsePlugin);

export default mongoose.model<IAccount>('Account', accountSchema);

