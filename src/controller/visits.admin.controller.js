import { Visit } from "../model/visit.model.js";
import { Notification } from "../model/notfication.model.js";
import { createVisitService, getCompletedVisitsWithIssuesService, getPastVisitsService, getUpcomingVisitsService, getVisits, getVisitsPagination, updateVisitService } from "../services/visit.services.js";
import mongoose from "mongoose";
import { User } from "../model/user.model.js";
import { UserPlan } from "../model/userPlan.models.js";

//admin creates a visit for a client
export const createVisit = async (req, res, next) => {
    const { clientEmail, staff, type, address, date, note } = req.body;

    try {
        // Validate required fields
        if (!clientEmail || !staff || !address || !date || !type) {
            return res.status(400).json({
                status: false,
                message: "Please provide all required fields",
            });
        }

        const client = await User.findOne({ email: clientEmail });
        if (!client) {
            return res.status(404).json({
                status: false,
                message: "Client not found",
            });
        }

        const activeVisit = await Visit.findOne({
            client: client._id,
            status: { $in: ["pending", "confirmed"] },
        });

        if (activeVisit) {
            return res.status(400).json({
                status: false,
                message: "Client already has an active visit (pending or confirmed).",
            });
        }

        const visitData = {
            client: client._id,
            staff,
            type,
            address,
            date,
            note,
            status: "confirmed",
            isPaid: true,
        };

        const response = await createVisitService(visitData, client._id);

        const formattedDate = new Date(date).toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        await Notification.create({
            userId: client._id,
            type: "visit schedule",
            message: `Visit scheduled for ${formattedDate}`,
        });

        if (staff) {
            await Notification.create({
                userId: staff,
                type: "visit schedule",
                message: `Visit scheduled for ${formattedDate}`,
            });
        }

        return res.status(201).json({
            status: true,
            message: "Visit created successfully",
            data: response,
        });

    } catch (error) {
        next(error);
    }
};

//admin gets all visits count
export const getAllVisitsCount = async (req, res, next) => {
    const { status } = req.query;

    const allowedStatuses = ["confirmed", "completed", "cancelled"];

    try {
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                status: false,
                message: "Invalid or missing status. Allowed: confirmed, completed, cancelled",
            });
        }

        const count = await Visit.countDocuments({ status });

        return res.status(200).json({
            status: true,
            message: `Visits count fetched successfully for status: ${status}`,
            total: count,
        });

    } catch (error) {
        next(error);
    }
};

export const getAdminAllVisit = async (req, res, next) => {

    const search = req.query.search?.trim().toLowerCase() || "";
    const status = req.query.status?.trim().toLowerCase() || null;
    const type = req.query.type?.trim().toLowerCase() || null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    try {
        // Fetch all visits with population
        const allVisits = await Visit.find()
            .populate({ path: "client staff", select: "fullname email" }).populate({
                path: "userPlan",
                select: "plan addOnServices",
                populate: [
                    { path: "plan", select: "name" },
                    { path: "addOnServices", select: "name" }
                ]
            }).sort({ createdAt: -1 })

        // Filter by search and status
        let filtered = allVisits.filter(v => {
            const clientName = v.client?.fullname?.toLowerCase() || "";
            const staffName = v.staff?.fullname?.toLowerCase() || "";
            const visitType = v.type?.toLowerCase() || "";
            const visitStatus = v.status?.toLowerCase() || "";
            const visitId = v.visitId?.toLowerCase() || "";

            const matchesSearch = search
                ? clientName.includes(search) ||
                staffName.includes(search) ||
                visitType.includes(search) ||
                visitStatus.includes(search) ||
                visitId.includes(search)
                : true;

            const matchesStatus = status ? visitStatus === status : true;

            const matchesTypes = type ? visitType === type : true;

            return matchesSearch && matchesStatus && matchesTypes;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / limit);

        const paginatedVisits = filtered.slice(skip, skip + limit);

        const meta = {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit
        };

        return res.status(200).json({
            success: true,
            data: paginatedVisits,
            meta
        });

    }

    catch (error) {
        next(error)
    }
};

//admin gets all confirmed visits for a client
export const getConfirmedVisits = async (req, res, next) => {

    const { client } = req.params

    try {
        await getVisits(client, "confirmed", res)
    }

    catch (error) {
        next(error)
    }
}

//admin gets all pending visits for
export const getAllPendingVisits = async (req, res, next) => {
    try {
        const response = await Visit.find({ status: "pending" }).populate({
            path: "userPlan",
            select: "plan addOnServices",
            populate: [
                { path: "plan", select: "name" },
                { path: "addOnServices", select: "name" }
            ]
        })
        return res.status(200).json({
            status: true,
            message: "Pending visits fetched successfully",
            data: response
        })
    } catch (error) {
        next(error)

    }

}

//admin gets all completed visits for a client
export const getCompletedVisits = async (req, res, next) => {

    const { client } = req.params

    try {
        await getVisits(client, "completed", res)
    }

    catch (error) {
        next(error)
    }
}

export const getCompletedVisitsPagination = async (req, res, next) => {

    const { client } = req.params
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10

    try {
        await getVisitsPagination(page, limit, client, "completed", res)
    }

    catch (error) {
        next(error)
    }
}

export const getCompletedVisitsWithIssues = async (req, res, next) => {

    const { client } = req.params
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10

    try {
        await getCompletedVisitsWithIssuesService(page, limit, client, res)
    }

    catch (error) {
        next(error)
    }
}

//admin gets all cancelled visits for a client
export const getCancelledVisits = async (req, res, next) => {

    const { client } = req.params

    try {
        await getVisits(client, "cancelled", res)
    }
    catch (error) {
        next(error)
    }
}

//admin gets all past visits for a client
export const getPastVisits = async (req, res, next) => {
    const { client } = req.params
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10

    try {
        await getPastVisitsService(page, limit, client, res)
    }

    catch (error) {
        next(error)
    }
}

//admin gets all upcoming visits for a client
export const getUpcomingVisits = async (req, res, next) => {

    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10

    try {
        await getUpcomingVisitsService(page, limit, res)
    }

    catch (error) {
        next(error)
    }
}





//     try {

//     }

//     catch (error) {
//         next(error)
//     }
// }

export const updateVisit = async (req, res, next) => {
    const { id } = req.params;
    const { staff, type, notes } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid visit ID"
            });
        }

        const updatedVisit = await Visit.findByIdAndUpdate(
            id,
            {
                staff,
                type,
                notes,
                status: "confirmed"
            },
            {
                new: true,
                runValidators: true
            }
        ).populate('client', 'email').populate('staff', 'email').populate({
            path: "userPlan",
            select: "plan addOnServices",
            populate: [
                { path: "plan", select: "name" },
                { path: "addOnServices", select: "name" }
            ]
        })

        if (!updatedVisit) {
            return res.status(404).json({
                status: false,
                message: "Visit not found"
            });
        }

        const formattedDate = new Date(updatedVisit.date).toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        // Notify users
        await Notification.create({
            userId: updatedVisit.client._id,
            type: "visit update",
            message: `Visit log updated for ${updatedVisit.visitId} (${formattedDate})`,
        });

        if (updatedVisit.staff) {
            await Notification.create({
                userId: updatedVisit.staff._id,
                type: "visit update",
                message: `Visit log updated for ${updatedVisit.visitId} (${formattedDate})`,
            });
        }

        return res.status(200).json({
            status: true,
            message: "Visit updated successfully",
            data: updatedVisit,
        });
    } catch (error) {
        next(error);
    }
}
export const updateVisitStaff = async (req, res, next) => {
    const { id } = req.params;
    const { staff } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid visit ID"
            });
        }

        const visit = await Visit.findByIdAndUpdate(
            id,
            {
                staff,
                status: "confirmed"
            },
            {
                new: true,
                runValidators: true
            }
        ).lean();

        if (!visit) {
            return res.status(404).json({
                status: false,
                message: "Visit not found"
            });
        }

        return res.status(200).json({
            status: true,
            message: "Visit staff updated successfully",
            data: visit
        });
    } catch (error) {
        next(error);
    }
}
export const getSpecificVisit = async (req, res, next) => {
    const { id } = req.params

    try {
        const visit = await Visit.findById(id)
            .populate({ path: "client staff", select: "-sessions -refreshToken" })
            .populate({
                path: "userPlan",
                select: "plan addOnServices",
                populate: [
                    { path: "plan", select: "name" },
                    { path: "addOnServices", select: "name" }
                ]
            })
            .sort({ createdAt: -1 })
            .lean()
        if (!visit) {
            return res.status(404).json({
                status: false,
                message: "Visit not found"
            });
        }
        return res.status(200).json({
            status: true,
            message: "Visit fetched successfully",
            data: visit
        });
    }
    catch (error) {
        next(error)
    }
}

export const getEmails = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const visits = await Visit.find({
            status: { $in: ["confirmed", "pending"] }
        })
            .populate({
                path: "client",
                select: "email"
            }).select("-staff -address -date -type -notes -issues -cancellationReason -createdAt -updatedAt -status -isPaid -__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Count total matching visits for pagination
        const total = await Visit.countDocuments({
            status: { $in: ["confirmed", "pending"] }
        });

        // Calculate total pages
        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            data: visits,
            meta: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        next(error);
    }
};