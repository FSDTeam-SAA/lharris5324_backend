import mongoose from 'mongoose'
import { Visit } from '../model/visit.model.js'

export const getVisitById = async (req, res, next) => {
  const { id } = req.params

  try {
    const visit =
      mongoose.Types.ObjectId.isValid(id) &&
      (await Visit.findById(id).populate({
        path: "userPlan",
        select: "plan addOnServices",
        populate: [
          { path: "plan", select: "name" },
          { path: "addOnServices", select: "name" }
        ]
      }).select('-createdAt -updatedAt -__v').lean())

    if (!visit) {
      return res.status(404).json({
        status: false,
        message: 'Visit not found',
      })
    }

    return res.status(200).json({
      status: true,
      message: 'Visit fetched successfully',
      data: visit,
    })
  } catch (error) {
    next(error)
  }
}

export const updateVisitStatus = async (req, res, next) => {
  const { id } = req.params
  const { status } = req.body

  try {
    let visit

    //client or admin can cancel the visit
    if (status === 'cancelled') {
      const { cancellationReason } = req.body
      visit =
        mongoose.Types.ObjectId.isValid(id) &&
        (await Visit.findByIdAndUpdate(
          id,
          { status, cancellationReason },
          { new: true }
        ).select('-createdAt -updatedAt -__v'))
    }

    //admin or staff can add notes for a completed visit
    if (status === 'completed') {
      const { notes } = req.body
      visit =
        mongoose.Types.ObjectId.isValid(id) &&
        (await Visit.findByIdAndUpdate(
          id,
          { status, notes },
          { new: true }
        ).select('-createdAt -updatedAt -__v'))
    }

    if (!visit) {
      return res.status(404).json({
        status: false,
        message: 'Visit not found',
      })
    }

    return res.status(200).json({
      status: true,
      message: 'Visit status updated successfully',
      data: visit,
    })
  } catch (error) {
    next(error)
  }
}

export const activeVisitClientInfo = async (req, res, next) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Get total count of confirmed visits
    const totalItems = await Visit.countDocuments({ status: 'confirmed' })

    // Get paginated visits
    const activeVisits = await Visit.find({ status: 'confirmed' })
      .populate('client', 'fullname email')
      .populate('staff', 'fullname')
      .populate("userPlan", "plan addOnServices")
      .skip(skip)
      .limit(limit)
      .lean()

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limit)

    // Return response with pagination
    res.status(200).json({
      status: true,
      message: 'Active visits fetched successfully',
      data: activeVisits,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limit,
      },
    })
  } catch (error) {
    console.error('Error fetching active visits:', error)
    res.status(500).json({
      status: false,
      message: 'Internal server error!',
    })
  }
}