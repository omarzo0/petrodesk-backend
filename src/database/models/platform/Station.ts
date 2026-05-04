import mongoose, { Schema, Document } from 'mongoose';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IStation extends Document {
    name: string;
    nameAr: string;
    code: string;
    owner: mongoose.Types.ObjectId;
    address: string;
    phone: string;
    logo?: string;
    isActive: boolean;
    isBanned: boolean;
    banReason?: string;
    bannedAt?: Date;
}

const stationSchema = new Schema<IStation>({
    name: { type: String, required: true },
    nameAr: { type: String, default: '' },
    code: { type: String, required: true, unique: true },
    owner: { type: Schema.Types.ObjectId, ref: 'Admin' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    logo: { type: String },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    bannedAt: { type: Date },
}, { timestamps: true });

stationSchema.plugin(responsePlugin);

export default mongoose.model<IStation>('Station', stationSchema);
