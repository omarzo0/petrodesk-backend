import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IOil extends Document {
    station: Types.ObjectId;
    oilName: string;
    price: number;
}

export interface IOilStorage extends Document {
    station: Types.ObjectId;
    date: string;
    oilName: string;
    startBalance: number;
    endBalance: number;
    storageIncoming: number;
}

export interface IOilShift extends Document {
    station: Types.ObjectId;
    date: string;
    oilName: string;
    firstTermBalance: number;
    endTermBalance: number;
    incoming: number;
    sold: number;
    price: number;
    total: number;
}

const oilSchema = new Schema<IOil>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    oilName: { type: String, required: true, unique: true },
    price: { type: Number, default: 0 },
}, { timestamps: true });

const oilStorageSchema = new Schema<IOilStorage>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    oilName: { type: String, required: true },
    startBalance: { type: Number, default: 0 },
    endBalance: { type: Number, default: 0 },
    storageIncoming: { type: Number, default: 0 },
}, { timestamps: true });


const oilShiftSchema = new Schema<IOilShift>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    oilName: { type: String, required: true },
    firstTermBalance: { type: Number, default: 0 },
    endTermBalance: { type: Number, default: 0 },
    incoming: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
}, { timestamps: true });


oilStorageSchema.index({ date: 1, oilName: 1 });
oilShiftSchema.index({ date: 1, oilName: 1 });

oilSchema.plugin(responsePlugin);
oilStorageSchema.plugin(responsePlugin);
oilShiftSchema.plugin(responsePlugin);

export const OilStorage = mongoose.model<IOilStorage>('OilStorage', oilStorageSchema);
export const OilShift = mongoose.model<IOilShift>('OilShift', oilShiftSchema);
const Oil = mongoose.model<IOil>('Oil', oilSchema);

export default Oil;
