import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IShiftDiary extends Document {
    station: Types.ObjectId;
    date: string;
    number: number;
}

const shiftDiarySchema = new Schema<IShiftDiary>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    number: { type: Number, default: 2 },
}, { timestamps: true });

shiftDiarySchema.plugin(responsePlugin);

export default mongoose.model<IShiftDiary>('ShiftDiary', shiftDiarySchema);
