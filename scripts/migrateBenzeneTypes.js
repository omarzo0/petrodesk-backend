const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);

        const BenzeneSchema = new mongoose.Schema({
            pumpType: String
        }, { strict: false });

        const Benzene = mongoose.model('Benzene', BenzeneSchema);

        const records = await Benzene.find({});
        console.log(`Found ${records.length} records to check.`);

        let updatedCount = 0;

        for (const record of records) {
            const oldType = record.pumpType;
            if (!oldType) continue;

            let newType = oldType.toLowerCase();
            if (newType.includes('solar') || newType.includes('سولار')) newType = 'solar';
            else if (newType.includes('80')) newType = 'ben80';
            else if (newType.includes('92')) newType = 'ben92';
            else if (newType.includes('95')) newType = 'ben95';

            if (newType !== oldType) {
                record.pumpType = newType;
                await record.save();
                updatedCount++;
                console.log(`Updated record ${record._id}: ${oldType} -> ${newType}`);
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} records.`);
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
