import mongoose from "mongoose";
import { Visit } from "../model/visit.model.js";
import { generateCode } from "../utils/generateCode.js";

export const createCode = async () => {

    let code;
    let visit

    do {
        code = generateCode();

        visit = await Visit.findOne({ visitCode: code }).lean()
    } while (visit)

    return code;
}

export const createVisitService = async (visitData, clientId) => {
    if (!visitData.status) {
        throw new Error("Status is required");
    }

    const visit = new Visit({
        ...visitData,
        client: clientId,
    });

    return await visit.save();
};
//  get all visits by both
export const getAllVisitsService = async (page, limit, status, res) => {
    try {
        const query = {};

        if (status) {
            query.status = status;
        }

        const total = await Visit.countDocuments(query);

        const visits = await Visit.find(query)
            .populate("client", "name email")
            .populate("staff", "name position")
            .populate({
                path: "userPlan",
                select: "plan addOnServices",
                populate: [
                    { path: "plan", select: "name" },
                    { path: "addOnServices", select: "name" }
                ]
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return res.status(200).json({
            status: true,
            message: "All visits fetched successfully",
            data: visits,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        throw new Error("Error fetching visits: " + error.message);
    }
};

//get visits by status
export const getVisits = async (client, status, res) => {

    const visits = await Visit.find({ client, status }).populate({ path: "client staff", select: "fullname email" }).populate({
        path: "userPlan",
        select: "plan addOnServices",
        populate: [
            { path: "plan", select: "name" },
            { path: "addOnServices", select: "name" }
        ]
    }).sort({ createdAt: -1 }).lean()

    return res.status(200).json({
        status: true,
        message: `${status} visits fetched successfully`,
        data: visits
    })
}

export const getVisitsPagination = async (page, limit, client, status, res) => {

    const visits = await Visit.find({
        client,
        status
    })
        .populate("client staff")
        .populate({
            path: "userPlan",
            select: "plan addOnServices",
            populate: [
                { path: "plan", select: "name" },
                { path: "addOnServices", select: "name" }
            ]
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean()

    const total = await Visit.countDocuments({
        client,
        status
    });

    return res.status(200).json({
        status: true,
        data: visits,
        pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: Number(limit)
        }
    })
}

export const getCompletedVisitsWithIssuesService = async (page, limit, client, res) => {

    const query = {
        client,
        status: "completed",
        issues: { $ne: [] } // only visits where issues array is not empty
    };

    const visits = await Visit.find(query)
        .populate("client staff")
        .populate({
            path: "userPlan",
            select: "plan addOnServices",
            populate: [
                { path: "plan", select: "name" },
                { path: "addOnServices", select: "name" }
            ]
        })
        .sort({ date: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean()

    const total = await Visit.countDocuments(query);

    return res.status(200).json({
        status: true,
        data: visits,
        pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: Number(limit)
        }
    })
}

//get visits by type
export const getVisitsByTypeService = async (page, limit, client, type, res) => {

    let query

    if (client) {
        query = { client, type }
    }

    else {
        query = { type }
    }

    const visits = await Visit.find(query)
        .populate("client staff")
        .populate({
            path: "userPlan",
            select: "plan addOnServices",
            populate: [
                { path: "plan", select: "name" },
                { path: "addOnServices", select: "name" }
            ]
        })
        .sort({ date: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean()

    const total = await Visit.countDocuments(query);

    return res.status(200).json({
        status: true,
        message: `${type} visits fetched successfully`,
        data: visits,
        pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: Number(limit)
        }
    })
}

export const getPastVisitsService = async (page, limit, client, res) => {
    const query = {
        client,
        status: "completed"
    };

    const visits = await Visit.find(query)
        .populate({ path: "client staff", select: "fullname email" })
        .populate({
            path: "userPlan",
            select: "plan addOnServices",
            populate: [
                { path: "plan", select: "name" },
                { path: "addOnServices", select: "name" }
            ]
        })
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean();

    const total = await Visit.countDocuments(query);

    return res.status(200).json({
        status: true,
        message: "Past visits fetched successfully",
        data: visits,
        pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: Number(limit)
        }
    });
};

export const getUpcomingVisitsService = async (page, limit, client) => {
    try {
        const query = {
            status: { $in: ["pending"] },  // Note: $in expects an array
            client: client
        };

        const visits = await Visit.find(query)
            .populate({ path: "client", select: "-sessions -refreshToken" })
            .populate({
                path: "userPlan",
                select: "plan addOnServices",
                populate: [
                    { path: "plan", select: "name" },
                    { path: "addOnServices", select: "name" }
                ]
            })
            .sort({ date: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Visit.countDocuments(query);

        return {
            status: true,
            message: "Upcoming visits fetched successfully",
            data: visits,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: Number(limit)
            }
        };
    } catch (error) {
        throw error;
    }
}
export const updateVisitService = async (updateData, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid visit ID format");
    }

    const existingVisit = await Visit.findById(id)
        .select("status date client");

    if (!existingVisit) {
        throw new Error("Visit not found");
    }

    if (["completed", "cancelled"].includes(existingVisit.status)) {
        throw new Error("Cannot update a completed or cancelled visit");
    }

    if (updateData.date || existingVisit.date) {
        const visitDate = updateData.date || existingVisit.date;
        const duplicateVisit = await Visit.findOne({
            date: visitDate,
            client: existingVisit.client,
            status: { $in: ["pending", "confirmed"] },
            _id: { $ne: id }
        });

        if (duplicateVisit) {
            throw new Error("Client already has a visit scheduled for this date");
        }
    }

    const updatedVisit = await Visit.findByIdAndUpdate(
        id,
        updateData,
        {
            new: true,
            runValidators: true,
            select: "-createdAt -updatedAt -__v"
        }
    ).populate({
        path: "userPlan",
        select: "plan addOnServices",
        populate: [
            { path: "plan", select: "name" },
            { path: "addOnServices", select: "name" }
        ]
    }).populate([
        { path: "client", select: "-sessions -refreshToken" },
        { path: "staff", select: "-sessions -refreshToken" },
    ]);

    if (!updatedVisit) {
        throw new Error("Visit update failed");
    }

    return updatedVisit;
};
