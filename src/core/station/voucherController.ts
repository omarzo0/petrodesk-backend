import { Request, Response } from 'express';
import Voucher, { MatchingVoucher } from '../../database/models/station/Voucher';

import { BenzenePrice } from '../../database/models/station/Benzene';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Get vouchers for a date (optionally filter by benzType)
// @route   GET /api/vouchers/:date?benzType=...
export const getByDate = async (req: Request, res: Response) => {
    try {
        const filter: any = { station: req.stationId, date: req.params.date };
        if (req.query.pumpType) {
            filter.pumpType = req.query.pumpType;
        }
        const vouchers = await Voucher.find(filter);
        sendResponse(res, 200, true, vouchers);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Add a voucher
// @route   POST /api/vouchers
export const create = async (req: Request, res: Response) => {
    try {
        const { date, pumpType, side, liters, voucherSerial } = req.body;

        // Get price for this benzene type with lookback
        let priceRecord: any = await BenzenePrice.findOne({ station: req.stationId, date });

        if (!priceRecord) {
            // Find latest previous price record
            priceRecord = await BenzenePrice.findOne({ station: req.stationId, date: { $lt: date } }).sort({ date: -1 });
        }

        if (!priceRecord) {
            return sendResponse(res, 404, false, null, 'no_data_date');
        }

        let price = 0;
        const normalizedType = pumpType?.toLowerCase();

        if (normalizedType === 'solar' || normalizedType === 'سولار') price = priceRecord.solarPrice;
        else if (normalizedType === 'ben80' || normalizedType === '80') price = priceRecord.ben80Price;
        else if (normalizedType === 'ben92' || normalizedType === '92') price = priceRecord.ben92Price;
        else if (normalizedType === 'ben95' || normalizedType === '95') price = priceRecord.ben95Price;


        const total = price * liters;

        const voucher = await Voucher.create({
            station: req.stationId, date, pumpType, side, price, liters, total, voucherSerial,
        });

        // Update matching vouchers
        const existing: any = await MatchingVoucher.findOne({ station: req.stationId, date, liters, pumpType, side });
        if (!existing) {
            await MatchingVoucher.create({
                station: req.stationId, date, number: 1, liters, pumpType, side, price,
                total: liters * 1 * price,
            });
        } else {
            existing.number += 1;
            existing.price = price;
            existing.total = existing.number * liters * price;
            await existing.save();
        }

        await logActivity(
            req.admin,
            'CREATE',
            'Voucher',
            `اضافة بون: ${pumpType} - فئة ${liters} - مسلسل ${voucherSerial} بتاريخ ${date}`,
            { date, pumpType, side, liters, voucherSerial, total }
        );

        sendResponse(res, 201, true, voucher, 'add_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete a voucher
// @route   DELETE /api/vouchers/:id
export const deleteVoucher = async (req: Request, res: Response) => {
    try {
        const voucher: any = await Voucher.findOne({ _id: req.params.id, station: req.stationId });
        if (!voucher) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        // Update matching vouchers
        const matching: any = await MatchingVoucher.findOne({
            station: req.stationId,
            date: voucher.date,
            liters: voucher.liters,
            pumpType: voucher.pumpType,
            side: voucher.side,
        });

        if (matching) {
            matching.number -= 1;
            matching.total = matching.number * voucher.liters * voucher.price;
            await matching.save();
        }

        await logActivity(
            req.admin,
            'DELETE',
            'Voucher',
            `حذف بون: ${(voucher as any).pumpType} - فئة ${(voucher as any).liters} - مسلسل ${(voucher as any).voucherSerial} بتاريخ ${(voucher as any).date}`,
            { id: req.params.id }
        );

        await Voucher.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        sendResponse(res, 200, true, null, 'delete_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update a voucher
// @route   PUT /api/vouchers/:id
export const updateVoucher = async (req: Request, res: Response) => {
    try {
        const { date, pumpType, side, liters, voucherSerial } = req.body;
        let { price, total } = req.body;

        const oldVoucher: any = await Voucher.findOne({ _id: req.params.id, station: req.stationId });
        if (!oldVoucher) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        // If price/total not provided, recalculate
        if (price === undefined || total === undefined) {
            let priceRecord: any = await BenzenePrice.findOne({ station: req.stationId, date: date || oldVoucher.date });
            if (!priceRecord) {
                // Lookback
                priceRecord = await BenzenePrice.findOne({ station: req.stationId, date: { $lt: (date || oldVoucher.date) } }).sort({ date: -1 });
            }

            if (!priceRecord) {
                return sendResponse(res, 404, false, null, 'no_data_date');
            }

            const currentType = pumpType || oldVoucher.pumpType;
            const normalizedType = currentType?.toLowerCase();

            if (price === undefined) {
                if (normalizedType === 'solar' || normalizedType === 'سولار') price = priceRecord.solarPrice;
                else if (normalizedType === 'ben80' || normalizedType === '80') price = priceRecord.ben80Price;
                else if (normalizedType === 'ben92' || normalizedType === '92') price = priceRecord.ben92Price;
                else if (normalizedType === 'ben95' || normalizedType === '95') price = priceRecord.ben95Price;
            }


            if (total === undefined) {
                total = price * (liters || oldVoucher.liters);
            }
        }

        // Handle MatchingVoucher updates
        const isMatchingFieldChanged =
            (date && date !== oldVoucher.date) ||
            (pumpType && pumpType !== oldVoucher.pumpType) ||
            (side && side !== oldVoucher.side) ||
            (liters && liters !== oldVoucher.liters);

        if (isMatchingFieldChanged) {
            // Decrement old matching
            const oldMatching: any = await MatchingVoucher.findOne({
                station: req.stationId,
                date: oldVoucher.date,
                liters: oldVoucher.liters,
                pumpType: oldVoucher.pumpType,
                side: oldVoucher.side,
            });
            if (oldMatching) {
                oldMatching.number -= 1;
                oldMatching.total = oldMatching.number * oldVoucher.liters * oldVoucher.price;
                await oldMatching.save();
            }

            // Increment new matching
            const newDate = date || oldVoucher.date;
            const newLiters = liters || oldVoucher.liters;
            const newType = pumpType || oldVoucher.pumpType;
            const newSide = side || oldVoucher.side;

            const existing: any = await MatchingVoucher.findOne({
                station: req.stationId,
                date: newDate,
                liters: newLiters,
                pumpType: newType,
                side: newSide
            });

            if (!existing) {
                await MatchingVoucher.create({
                    station: req.stationId, date: newDate, number: 1, liters: newLiters, pumpType: newType, side: newSide, price,
                    total: newLiters * 1 * price,
                });
            } else {
                existing.number += 1;
                existing.price = price;
                existing.total = existing.number * newLiters * price;
                await existing.save();
            }
        } else if (price !== oldVoucher.price || total !== oldVoucher.total) {
            // Only price/total changed, update existing matching
            const matching: any = await MatchingVoucher.findOne({
                station: req.stationId,
                date: oldVoucher.date,
                liters: oldVoucher.liters,
                pumpType: oldVoucher.pumpType,
                side: oldVoucher.side,
            });
            if (matching) {
                matching.price = price;
                matching.total = matching.number * oldVoucher.liters * price;
                await matching.save();
            }
        }

        const updated = await Voucher.findOneAndUpdate(
            { _id: req.params.id, station: req.stationId },
            { date, pumpType, side, liters, voucherSerial, price, total },
            { new: true }
        );

        await logActivity(
            req.admin,
            'UPDATE',
            'Voucher',
            `تعديل بون (${updated?.side}): ${updated?.pumpType} - فئة ${updated?.liters} - مسلسل ${updated?.voucherSerial} بتاريخ ${updated?.date}`,
            { id: req.params.id, date, pumpType, side, liters, voucherSerial, total }
        );


        sendResponse(res, 200, true, updated, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get matching vouchers for a date
// @route   GET /api/matching-vouchers/:date
export const getMatching = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        const { pumpType, side } = req.query;
        const filter: any = { station: req.stationId, date };
        if (pumpType) filter.pumpType = pumpType;
        if (side) filter.side = side;

        const matching = await MatchingVoucher.find(filter).sort({ liters: 1 });

        // Filter out zero entries
        const filtered = matching.filter((m: any) => m.number > 0);
        const total = filtered.reduce((sum, m: any) => sum + (m.total || 0), 0);

        sendResponse(res, 200, true, { data: filtered, total });
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
