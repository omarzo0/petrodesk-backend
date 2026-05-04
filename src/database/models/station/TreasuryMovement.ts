import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface ITreasuryMovement extends Document {
    station: Types.ObjectId;
    date: string;
    type: string;
    statement: string;
    receiptName: string;
    money: number;
    description: string;
}

const treasuryMovementSchema = new Schema<ITreasuryMovement>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    type: { type: String, required: true },
    statement: { type: String, required: true },
    receiptName: { type: String, default: '' },
    money: { type: Number, default: 0 },
    description: { type: String, default: '' },
}, { timestamps: true });

treasuryMovementSchema.index({ date: 1, type: 1, statement: 1 });
treasuryMovementSchema.plugin(responsePlugin);

export default mongoose.model<ITreasuryMovement>('TreasuryMovement', treasuryMovementSchema);

