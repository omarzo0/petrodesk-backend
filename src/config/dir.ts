import path from 'path';

export const DIRS = {
    ROOT: path.resolve(process.cwd()),
    SRC: path.resolve(process.cwd(), 'src'),
    PUBLIC: path.resolve(process.cwd(), 'public'),
    LOCALES: path.resolve(process.cwd(), 'locales')
};
