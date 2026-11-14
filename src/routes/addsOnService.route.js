import express from "express";
import { createAddsOnService, deleteAddsOnService, getAllAddsOnServices, updateAddsOnService, addServiceToPlan, getUserPlanConfiguration, removeServiceFromPlan } from "../controller/addsOnService.controller.js";
import {verifyJWT} from '../middleware/auth.middleware.js'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const router = express.Router();

router.post("/create-addsOnService", createAddsOnService);
router.post("/:planId/addsOnService/:serviceId",verifyJWT, addServiceToPlan);
router.get("/getUserPlanConfiguration/:planId/:userId",verifyJWT, getUserPlanConfiguration);
router.delete("/remove-service-from-plan/:planId/:serviceId", removeServiceFromPlan);
router.get("/get-all-addsOnService", getAllAddsOnServices);
router.put("/update-addsOnService/:id", updateAddsOnService);
router.delete("/delete-addsOnService/:id", deleteAddsOnService);


export default router;

