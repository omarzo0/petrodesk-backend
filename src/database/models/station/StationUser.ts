import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IStationUser extends Document {
    station: Types.ObjectId;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    nationalId: string;
    role: 'admin' | 'manager' | 'cashier' | 'financial';
    language: 'en' | 'ar';
    resetPasswordOtp?: string;
    resetPasswordOtpExpire?: Date;
    loginAttempts: number;
    lockUntil?: Date;
    isBanned: boolean;
    banReason?: string;
    bannedAt?: Date;
    matchPassword(password: string): Promise<boolean>;
}

const stationUserSchema = new Schema<IStationUser>({
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    nationalId: { type: String, required: true, unique: true },
    role: {
        type: String,
        enum: ['admin', 'manager', 'cashier', 'financial'],
        default: 'manager'
    },
    language: {
        type: String,
        enum: ['en', 'ar'],
        default: 'ar'
    },
    resetPasswordOtp: String,
    resetPasswordOtpExpire: Date,
    loginAttempts: { type: Number, default: 0, required: true },
    lockUntil: { type: Date },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    bannedAt: { type: Date },
}, { timestamps: true });

// Apply global response plugin
stationUserSchema.plugin(responsePlugin);

// Hash password before saving
stationUserSchema.pre<IStationUser>('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
stationUserSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IStationUser>('StationUser', stationUserSchema);
