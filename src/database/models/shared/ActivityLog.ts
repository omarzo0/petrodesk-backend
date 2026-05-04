import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IActivityLog extends Document {
    station?: Types.ObjectId;
    date: string;
    time: string;
    email: string;
    adminName: string;
    role: string;
    type: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'OTHER';
    category: string;
    move: string;
    details: any;
}

const activityLogSchema = new Schema<IActivityLog>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', index: true },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    email: { type: String, required: true, index: true },
    adminName: { type: String },
    role: { type: String },
    type: {
        type: String,
        required: true,
        enum: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'OTHER'],
        index: true
    },
    category: { type: String, required: true, index: true }, // e.g., 'Oil', 'Benzene', 'Voucher'
    move: { type: String, required: true }, // Descriptive text of what happened
    details: { type: Schema.Types.Mixed }, // Arbitrary object for diffs or extra info
}, { timestamps: true });

activityLogSchema.plugin(responsePlugin);

export default mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
