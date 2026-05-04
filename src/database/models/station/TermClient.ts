import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface ITermClient extends Document {
    station: Types.ObjectId;
    date: string;
    clientName: string;
    receiptName: string;
    money: number;
    receiptNumber: string;
}


const termClientSchema = new Schema<ITermClient>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    receiptName: { type: String, default: '' },
    money: { type: Number, default: 0 },
    receiptNumber: { type: String, default: '' },
}, { timestamps: true });



termClientSchema.plugin(responsePlugin);

export default mongoose.model<ITermClient>('TermClient', termClientSchema);
