import { Router } from "express";
import {
  createVisit,
  getCancelledVisits,
  getConfirmedVisits,
  getCompletedVisits,
  checkPaymentStatus,
  getAllIssuesCount,
  getNextVisit,
  getPastVisits,
  getUpcomingVisits,
  getCompletedVisitsPagination,
  getCompletedVisitsWithIssues,
  getAllVisitForSpecificClient,
} from "../controller/visits.client.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { isClient } from "../middleware/role.middleware.js";
import { updateUserActivity } from "../middleware/updateUserActivity.middleware.js";

const router = Router();

router.post("/create-visit", verifyJWT, updateUserActivity, createVisit);

router.get(
  "/get-visit-client",
  verifyJWT,
  isClient,
  updateUserActivity,
  getAllVisitForSpecificClient
);

router.get(
  "/get-confirmed-visits",
  verifyJWT,
  isClient,
  updateUserActivity,
  getConfirmedVisits
);

router.get(
  "/get-completed-visits",
  verifyJWT,
  isClient,
  updateUserActivity,
  getCompletedVisits
);

router.get(
  "/get-completed-visits-pagination",
  verifyJWT,
  isClient,
  updateUserActivity,
  getCompletedVisitsPagination
);

router.get(
  "/get-completed-visits-with-issues",
  verifyJWT,
  isClient,
  updateUserActivity,
  getCompletedVisitsWithIssues
);

router.get(
  "/get-cancelled-visits",
  verifyJWT,
  isClient,
  updateUserActivity,
  getCancelledVisits
);

router.get(
  "/get-past-visits",
  verifyJWT,
  isClient,
  updateUserActivity,
  getPastVisits
);

router.get(
  "/get-upcoming-visits",
  verifyJWT,
  isClient,
  updateUserActivity,
  getUpcomingVisits
);

router.get(
  "/get-next-visit",
  verifyJWT,
  isClient,
  updateUserActivity,
  getNextVisit
);

router.get(
  "/get-all-issues-count",
  verifyJWT,
  isClient,
  updateUserActivity,
  getAllIssuesCount
);

router.get(
  "/check-payment-status",
  verifyJWT,
  isClient,
  updateUserActivity,
  checkPaymentStatus
);

export default router;
