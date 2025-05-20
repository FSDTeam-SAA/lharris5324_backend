import mongoose from "mongoose"
import { Payment } from "../model/payment.model.js"
import { Visit } from "../model/visit.model.js"
import { createVisitService, getAllVisitsService, getCompletedVisitsWithIssuesService, getPastVisitsService, getUpcomingVisitsService, getVisits, getVisitsPagination, updateVisitService } from "../services/visit.services.js"
import { UserPlan } from "../model/userPlan.models.js";

export const createVisit = async (req, res, next) => {
    const { address, date } = req.body;
    const client = req.user._id;

    try {
        if (!address || !date) {
            return res.status(400).json({
                status: false,
                message: "Please provide all required fields"
            });
        }

        const userPlan = await UserPlan.findOne({ user: client })
            .populate("plan addOnServices")

        const existingActiveVisit = await Visit.findOne({
            client,
            status: { $in: ["pending", "confirmed"] }
        });

        if (existingActiveVisit) {
            return res.status(400).json({
                status: false,
                message: "You already have an active visit. Please complete it before creating a new one."
            });
        }

        const isPaid = await Payment.find({ user: client })
            .populate("plan")
            .sort({ createdAt: -1 })
            .lean();

        if (!isPaid || isPaid.length === 0) {
            return res.status(400).json({
                status: false,
                message: "You have not made any payment yet. Please make a payment first."
            });
        }

        let date1 = new Date(isPaid[0].createdAt);
        let currentDate = new Date();

        if (isPaid[0].plan.pack === 'daily') {
            date1.setDate(date1.getDate() + 1);
        } else if (isPaid[0].plan.pack === 'weekly') {
            date1.setDate(date1.getDate() + 7);
        } else if (isPaid[0].plan.pack === 'monthly') {
            date1.setDate(date1.getDate() + 30);
        }

        if (!isPaid || (isPaid[0].status === "completed" && isPaid[0].plan.pack === "per-patrol")) {
            return res.status(400).json({
                status: false,
                message: "Your payment has expired. Please make a new payment."
            });
        }

        if (isPaid[0].status === "pending" || isPaid[0].status === "failed" || isPaid[0].status === "refunded") {
            return res.status(400).json({
                status: false,
                message: `Your payment is ${isPaid[0].status} . Please wait for it to be payment or completed before creating a visit.`
            });
        }

        if (currentDate > date1) {
            return res.status(400).json({
                status: false,
                message: "Your payment has expired. Please make a new payment."
            });
        }

        const visitData = await createVisitService(
            {
                address,
                date,
                isPaid: isPaid?.status === "completed",
                status: "pending",
                userPlan
            },
            client,
            res
        );

        return res.status(201).json({
            status: true,
            message: "Visit created successfully",
            data: { visitData, userPlan }
        });
    } catch (error) {
        next(error);
    }
};
export const getAllVisits = async (req, res, next) => {

    const client = req.user._id
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10

    try {
        await getAllVisitsService(page, limit, client, res)
    }

    catch (error) {
        next(error)
    }
}

export const getAllVisitForSpecificClient = async (req, res, next) => {
    const clientId = req.user._id;
    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim() || null;
    const type = req.query.type?.trim() || null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return res.status(400).json({ success: false, message: "clientId is required" });
    }

    try {
        // Build the base filter query
        const filterQuery = { client: clientId };

        // Add status and type filters if provided
        if (status) {
            filterQuery.status = { $regex: `^${status}$`, $options: 'i' };
        }
        if (type) {
            filterQuery.type = { $regex: `^${type}$`, $options: 'i' };
        }

        // Build search conditions if search term exists
        let searchConditions = [];
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            searchConditions = [
                { "client.fullname": searchRegex },
                { "staff.fullname": searchRegex },
                { type: searchRegex },
                { status: searchRegex },
                { visitId: searchRegex }
            ];
        }

        // First, get the total count for pagination
        const countQuery = { ...filterQuery };
        if (search) {
            countQuery.$or = searchConditions;
        }
        const totalItems = await Visit.countDocuments(countQuery);
        const totalPages = Math.ceil(totalItems / limit);

        // Main query to get visits
        let visitsQuery = Visit.find(filterQuery)
            .populate({
                path: "userPlan",
                select: "plan addOnServices",
                populate: [
                    { path: "plan", select: "name" },
                    { path: "addOnServices", select: "name" }
                ]
            })
            .skip(skip)
            .limit(limit)
            .lean(); // Convert to plain JS object

        // Apply search conditions if they exist
        if (search) {
            visitsQuery = visitsQuery.or(searchConditions);
        }

        // Populate related data
        visitsQuery = visitsQuery.populate([
            { path: 'client', select: '_id fullname' },
            { path: 'staff', select: '_id fullname' },
            { path: 'plan' },
            { path: 'addsOnService' }
        ]);

        // Execute the query
        const visits = await visitsQuery.exec();

        // Prepare metadata
        const meta = {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit
        };

        return res.status(200).json({
            success: true,
            data: visits,
            meta
        });
    } catch (error) {
        next(error);
    }
};
export const getConfirmedVisits = async (req, res, next) => {

    const client = req.user._id
    try {
        await getVisits(client, "confirmed", res)
    }

    catch (error) {
        next(error)
    }
}

export const getPendingVisits = async (req, res, next) => {

    const client = req.user._id
    try {
        await getVisits(client, "pending", res)
    }

    catch (error) {
        next(error)
    }
}

export const getCompletedVisits = async (req, res, next) => {

    const client = req.user._id
    try {
        await getVisits(client, "completed", res)
    }

    catch (error) {
        next(error)
    }
}

export const getCompletedVisitsPagination = async (req, res, next) => {

    const client = req.user._id
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

    const client = req.user._id
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10

    try {
        await getCompletedVisitsWithIssuesService(page, limit, client, res)
    }

    catch (error) {
        next(error)
    }
}

export const getCancelledVisits = async (req, res, next) => {

    const client = req.user._id
    try {
        await getVisits(client, "cancelled", res)
    }

    catch (error) {
        next(error)
    }
}

export const getPastVisits = async (req, res, next) => {
    const client = req.user._id
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10

    try {
        await getPastVisitsService(page, limit, client, res)
    }

    catch (error) {
        next(error)
    }
}

export const getUpcomingVisits = async (req, res, next) => {
    const client = req.user._id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    try {
        const result = await getUpcomingVisitsService(page, limit, client);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
export const getNextVisit = async (req, res, next) => {
    const client = req.user._id

    try {
        const visit =
            (await Visit.findOne({ client, date: { $gte: new Date() } })
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
                .select("-createdAt -updatedAt -__v")
                .lean())

        if (!visit) {
            return res.status(404).json({
                status: false,
                message: "No upcoming visits found"
            })
        }

        return res.status(200).json({
            status: true,
            message: "Next visit fetched successfully",
            data: visit
        })
    }

    catch (error) {
        next(error)
    }
}

export const updateVisit = async (req, res, next) => {
    const { id } = req.params
    const { address, date } = req.body
    const client = req.user._id

    try {
        const updatedVisit = await updateVisitService({ address, date }, id, client, res).populate({ path: "client staff", select: "-sessions -refreshToken" }).lean()

        return res.status(200).json({
            status: true,
            message: "Visit updated successfully",
            data: updatedVisit
        })
    }

    catch (error) {
        next(error)
    }
}

// All issues count
export const getAllIssuesCount = async (req, res, next) => {
    const client = req.user._id;

    try {
        const visits = await Visit.find({ client }).populate("issues").populate({
            path: "userPlan",
            select: "plan addOnServices",
            populate: [
                { path: "plan", select: "name" },
                { path: "addOnServices", select: "name" }
            ]
        }).lean();

        if (!visits || visits.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No visits found"
            });
        }

        const issuesCount = visits.reduce((count, visit) => {
            return count + (visit.issues && visit.issues.length > 0 ? 1 : 0);
        }, 0);

        return res.status(200).json({
            status: true,
            message: "Issues count fetched successfully",
            data: { issuesCount }
        });
    } catch (error) {
        next(error);
    }
};