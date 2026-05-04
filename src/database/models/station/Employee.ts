import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IEmployee extends Document {
    station: Types.ObjectId;
    name: string;
    nationalId: number;
    mobileNum: number;
    job: string;
    salary: number;
}

const employeeSchema = new Schema<IEmployee>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    name: { type: String, required: true },
    nationalId: { type: Number, required: true, unique: true },
    mobileNum: { type: Number, required: true },
    job: { type: String, required: true },
    salary: { type: Number, default: 0 },
}, { timestamps: true });

employeeSchema.plugin(responsePlugin);

export default mongoose.model<IEmployee>('Employee', employeeSchema);
