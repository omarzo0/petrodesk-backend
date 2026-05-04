import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IExpense extends Document {
    station: Types.ObjectId;
    date: string;
    receiptName: string;
    money: number;
}

const expenseSchema = new Schema<IExpense>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    date: { type: String, required: true, index: true },
    receiptName: { type: String, default: '' },
    money: { type: Number, default: 0 },
}, { timestamps: true });


expenseSchema.plugin(responsePlugin);

export default mongoose.model<IExpense>('Expense', expenseSchema);
