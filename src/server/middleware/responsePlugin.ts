import { Schema } from 'mongoose';

const responsePlugin = (schema: Schema) => {
    if (!(schema as any).options.timestamps) {
        schema.set('timestamps', true);
    }

    schema.set('toJSON', {
        virtuals: true,
        versionKey: false,
        transform: function (doc, ret: any) {
            delete ret.__v;
            if (ret.password) delete ret.password;
            return ret;
        }
    });

    if (!(schema.virtuals as any).id) {
        schema.virtual('id').get(function (this: any) {
            return this._id.toHexString();
        });
    }
};

export default responsePlugin;
