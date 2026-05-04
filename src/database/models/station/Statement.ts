import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IStatement extends Document {
    station: Types.ObjectId;
    name: string;
}

const statementSchema = new Schema<IStatement>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    name: { type: String, required: true },
}, { timestamps: true });

statementSchema.plugin(responsePlugin);

export default mongoose.model<IStatement>('Statement', statementSchema);
