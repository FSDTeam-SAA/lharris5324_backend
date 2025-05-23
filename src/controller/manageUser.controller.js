import { User } from "../model/user.model.js";

// Admin functionality
// export const getAllUsers = async (_, res, next) => {
//   try {
//     const users = await User.find({}, "id fullname email role status lastActive");
//     return res.status(200).json({
//       status: true,
//       message: "Fetched all users",
//       data: users,
//     });
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     next(error);
//   }
// };

// Admin functionality
export const getAllUsers = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filters from query
    const { role, status, search } = req.query;

    // Build dynamic filter object
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    // Add search filter (search by fullname or email)
    if (search) {
      filter.$or = [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    // Get total count based on filters
    const totalItems = await User.countDocuments(filter);

    // Get filtered & paginated users
    const users = await User.find(filter, "id fullname email role status lastActive")
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      status: true,
      message: "Fetched all users",
      data: users,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    next(error);
  }
};



// Get user by role and status (Admin functionality)
export const getUserByRoleStatus = async (req, res, next) => {
  const { role, status } = req.params;
  try {
    const users = await User.find({ role, status }, "id fullname email role status lastActive");
    return res.status(200).json({
      status: true,
      message: `Fetched ${role} users`,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users by role:", error);
    next(error);
  }
};

// Admin functionality
export const addUser = async (req, res, next) => {
  const { fullname, password, email, role } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ status: false, message: "User already exists" });
    }

    const newUser = new User({
      fullname,
      email,
      password,
      role,
      status: "active",
      lastActive: new Date(),
      sessions: [{ sessionStartTime: Date.now() }],
      isVerified: false
    });

    await newUser.save();
    return res.status(201).json({
      status: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    console.error("Error adding user:", error);
    next(error);
  }
};

// Update an existing user (Admin functionality)
export const updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { fullname, password, email, role, status } = req.body;

  if (!fullname || !email) {
    return res.status(400).json({
      status: false,
      message: "Fullname and email are required."
    });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    user.password = password || user.password;
    user.role = role || user.role;
    user.status = status || user.status;

    await user.save();

    return res.status(200).json({
      status: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    next(error);
  }
};

// Delete a user (Admin functionality)
export const deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    return res.status(200).json({
      status: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    next(error);
  }
};

export const getAllStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ role: "staff" }).select("-sessions -refreshToken").lean()
    return res.status(200).json({
      status: true,
      message: "Staff fetched successfully",
      data: staff
    })
  } catch (error) {
    next(error)
  }
}