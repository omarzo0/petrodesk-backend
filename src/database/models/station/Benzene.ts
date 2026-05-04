import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IBenzene extends Document {
    station: Types.ObjectId;
    date: string;
    pumpNumber: number;
    pumpType: string;
    start: number;
    end: number;
    liters: number;
    price: number;
    totalAmount: number;
}

export interface IBenzenePrice extends Document {
    station: Types.ObjectId;
    date: string;
    solarPrice: number;
    ben80Price: number;
    ben92Price: number;
    ben95Price: number;
}

const benzeneSchema = new Schema<IBenzene>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    pumpNumber: { type: Number, required: true },
    pumpType: { type: String, required: true },
    start: { type: Number, default: 0 },
    end: { type: Number, default: 0 },
    liters: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
}, { timestamps: true });

const benzenePriceSchema = new Schema<IBenzenePrice>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true },
    solarPrice: { type: Number, default: 0 },
    ben80Price: { type: Number, default: 0 },
    ben92Price: { type: Number, default: 0 },
    ben95Price: { type: Number, default: 0 },
}, { timestamps: true });

benzeneSchema.index({ date: 1, pumpType: 1 });
benzenePriceSchema.index({ date: 1 }, { unique: true });


benzeneSchema.plugin(responsePlugin);
benzenePriceSchema.plugin(responsePlugin);

export const BenzenePrice = mongoose.model<IBenzenePrice>('BenzenePrice', benzenePriceSchema);
const Benzene = mongoose.model<IBenzene>('Benzene', benzeneSchema);

export default Benzene;
