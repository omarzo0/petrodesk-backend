import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IWarning extends Document {
    station?: Types.ObjectId; // Optional for global warnings
    isGlobal: boolean;
    targetRoles: string[]; // e.g., ['admin', 'manager', 'cashier']
    type: 'violation' | 'missing_data' | 'overdue_payment' | 'announcement' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details?: string;
    issuedBy: Types.ObjectId;
    isResolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: Types.ObjectId;
    responses: Array<{
        user: Types.ObjectId;
        userType: 'platform' | 'station';
        message: string;
        createdAt: Date;
    }>;
}

const warningSchema = new Schema<IWarning>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', index: true },
    isGlobal: { type: Boolean, default: false },
    targetRoles: [{ type: String }],
    type: {
        type: String,
        enum: ['violation', 'missing_data', 'overdue_payment', 'announcement', 'other'],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    message: { type: String, required: true },
    details: { type: String },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'PlatformUser', required: true },
    isResolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'PlatformUser' },
    responses: [{
        user: { type: Schema.Types.ObjectId, required: true },
        userType: { type: String, enum: ['platform', 'station'], required: true },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
}, { timestamps: true });

warningSchema.plugin(responsePlugin);

export default mongoose.model<IWarning>('Warning', warningSchema);
