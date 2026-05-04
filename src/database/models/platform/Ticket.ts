import mongoose, { Schema, Document, Types } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface ITicket extends Document {
    station?: Types.ObjectId;
    ticketType: 'station' | 'internal';
    createdBy: Types.ObjectId;
    creatorType: 'PlatformUser' | 'StationUser';
    subject: string;
    description: string;
    category: 'technical' | 'billing' | 'feature_request' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    responses: Array<{
        user: Types.ObjectId;
        userType: 'platform' | 'station';
        message: string;
        createdAt: Date;
    }>;
    resolvedBy?: Types.ObjectId;
    resolvedAt?: Date;
}

const ticketSchema = new Schema<ITicket>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', index: true },
    ticketType: { type: String, enum: ['station', 'internal'], default: 'station', required: true },
    createdBy: { type: Schema.Types.ObjectId, required: true, refPath: 'creatorType' },
    creatorType: { type: String, enum: ['PlatformUser', 'StationUser'], required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['technical', 'billing', 'feature_request', 'other'],
        default: 'technical'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    responses: [{
        user: { type: Schema.Types.ObjectId, required: true },
        userType: { type: String, enum: ['platform', 'station'], required: true },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'PlatformUser' },
    resolvedAt: { type: Date },
}, { timestamps: true });

ticketSchema.plugin(responsePlugin);

export default mongoose.model<ITicket>('Ticket', ticketSchema);
