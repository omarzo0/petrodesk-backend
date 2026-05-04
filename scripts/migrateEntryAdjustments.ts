/**
 * Migration script: Rename old na2l/fr2s3r fields to transfer/priceDiff
 * in the na2lfr2keds collection.
 * 
 * Run: npx ts-node --files scripts/migrateEntryAdjustments.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { ENV } from '../src/config';

async function migrate() {
    await mongoose.connect(ENV.MONGO_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.db!.collection('na2lfr2keds');

    // Rename na2l -> transfer, fr2s3r -> priceDiff
    const result = await collection.updateMany(
        { $or: [{ na2l: { $exists: true } }, { fr2s3r: { $exists: true } }] },
        { $rename: { 'na2l': 'transfer', 'fr2s3r': 'priceDiff' } }
    );

    console.log(`Migrated ${result.modifiedCount} documents (renamed na2l→transfer, fr2s3r→priceDiff)`);

    await mongoose.disconnect();
    console.log('Done');
}

migrate().catch(console.error);
