import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IVoucher extends Document {
    station: Types.ObjectId;
    date: string;
    pumpType: string;
    side: string;
    price: number;
    liters: number;
    total: number;
    voucherSerial: number;
}


export interface IMatchingVoucher extends Document {
    station: Types.ObjectId;
    date: string;
    number: number;
    liters: number;
    pumpType: string;
    side: string;
    price: number;
    total: number;
}


const voucherSchema = new Schema<IVoucher>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    pumpType: { type: String, required: true },
    side: { type: String, required: true },
    price: { type: Number, default: 0 },
    liters: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    voucherSerial: { type: Number, default: 0 },
}, { timestamps: true });


const matchingVoucherSchema = new Schema<IMatchingVoucher>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    number: { type: Number, default: 0 },
    liters: { type: Number, default: 0 },
    pumpType: { type: String, required: true },
    side: { type: String, required: true },
    price: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
}, { timestamps: true });

voucherSchema.index({ date: 1, pumpType: 1 });
matchingVoucherSchema.index({ date: 1, liters: 1, pumpType: 1, side: 1 });


voucherSchema.plugin(responsePlugin);
matchingVoucherSchema.plugin(responsePlugin);

export const MatchingVoucher = mongoose.model<IMatchingVoucher>('MatchingVoucher', matchingVoucherSchema);
const Voucher = mongoose.model<IVoucher>('Voucher', voucherSchema);

export default Voucher;

