import express, { Request, Response } from 'express';
import uploadMiddleware from '../../middleware/uploadMiddleware';
import sendResponse from '../../utils/responseHandler';
import { auth } from '../../middleware/auth';


const router = express.Router();

// @desc    Upload a single image
// @route   POST /api/upload/single
// @access  Private (Admin)
router.post('/single', auth, uploadMiddleware.single('image'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return sendResponse(res, 400, false, null, 'Please upload an image');
        }

        const imageUrl = (req.file as any).path; // multer-storage-cloudinary provides the secure_url in 'path'

        sendResponse(res, 200, true, { url: imageUrl }, 'Image uploaded successfully');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
});

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Private (Admin)
router.post('/multiple', auth, uploadMiddleware.array('images', 5), (req: Request, res: Response) => {
    try {
        if (!req.files || (req.files as any).length === 0) {
            return sendResponse(res, 400, false, null, 'Please upload at least one image');
        }

        const urls = (req.files as any[]).map((file: any) => file.path);

        sendResponse(res, 200, true, { urls }, 'Images uploaded successfully');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
});

export default router;
