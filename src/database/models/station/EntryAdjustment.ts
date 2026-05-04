import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IEntryAdjustment extends Document {
    station: Types.ObjectId;
    date: string;
    type: string;
    statement: string;
    transfer: number;
    priceDiff: number;
}

const entryAdjustmentSchema = new Schema<IEntryAdjustment>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    type: { type: String, required: true },
    statement: { type: String, required: true },
    transfer: { type: Number, default: 0 },
    priceDiff: { type: Number, default: 0 },
}, { timestamps: true });

entryAdjustmentSchema.index({ date: 1, type: 1, statement: 1 });
entryAdjustmentSchema.plugin(responsePlugin);

export default mongoose.model<IEntryAdjustment>('EntryAdjustment', entryAdjustmentSchema, 'na2lfr2keds');
