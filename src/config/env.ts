import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
    PORT: process.env.PORT || 5001,
    MONGO_URI: process.env.MONGO_URI || '',
    JWT_SECRET: process.env.JWT_SECRET || 'secret',
    NODE_ENV: process.env.NODE_ENV || 'development',
    EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
    EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
    EMAIL_USER: process.env.EMAIL_USER || '',
    EMAIL_PASS: process.env.EMAIL_PASS || '',
    EMAIL_FROM: process.env.EMAIL_FROM || '"PetroDesk" <noreply@petrodesk.com>',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
};



console.log(`[Config] Loaded environment: ${ENV.NODE_ENV}`);
console.log(`[Config] JWT_SECRET is ${process.env.JWT_SECRET ? 'from .env' : 'using DEFAULT'}`);
if (!process.env.MONGO_URI) console.warn('[Config] MONGO_URI is missing!');
