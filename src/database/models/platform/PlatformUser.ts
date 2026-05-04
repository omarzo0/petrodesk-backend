import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import responsePlugin from '../../../server/middleware/responsePlugin';

export interface IPlatformUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'super_admin' | 'admin' | 'employee';
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

const platformUserSchema = new Schema<IPlatformUser>({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'employee'],
        default: 'employee'
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
platformUserSchema.plugin(responsePlugin);

// Hash password before saving
platformUserSchema.pre<IPlatformUser>('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
platformUserSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IPlatformUser>('PlatformUser', platformUserSchema);
