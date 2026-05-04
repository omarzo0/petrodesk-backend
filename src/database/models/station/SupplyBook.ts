import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface ISupplyBook extends Document {
    station: Types.ObjectId;
    date: string;
    benzType: string;
    start: number;
    incoming: number;
    dispensed: number;
    pumps: string;
    end: number;
    standard: number;
}

const supplyBookSchema = new Schema<ISupplyBook>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    benzType: { type: String, required: true },
    start: { type: Number, default: 0 },
    incoming: { type: Number, default: 0 },
    dispensed: { type: Number, default: 0 },
    pumps: { type: String, default: '' },
    end: { type: Number, default: 0 },
    standard: { type: Number, default: 0 },
}, { timestamps: true });

supplyBookSchema.index({ date: 1, benzType: 1 });
supplyBookSchema.plugin(responsePlugin);

export default mongoose.model<ISupplyBook>('SupplyBook', supplyBookSchema);
