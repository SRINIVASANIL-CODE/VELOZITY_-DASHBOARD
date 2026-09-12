import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getActivity } from "../controllers/activityController";

const router = Router();
router.use(requireAuth);
router.get("/", getActivity);

export default router;
