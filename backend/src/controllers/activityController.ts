import { asyncHandler } from "../utils/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import * as activityService from "../services/activityService";

// GET /api/activity            -> last 20 events this user can see (initial feed load)
// GET /api/activity?since=ISO  -> everything since that timestamp (reconnect catch-up)
export const getActivity = asyncHandler(async (req: AuthedRequest, res) => {
  const since = req.query.since ? new Date(req.query.since as string) : undefined;
  const events = since
    ? await activityService.getActivitySince(req.user!, since)
    : await activityService.getRecentActivity(req.user!, 20);
  res.json({ events });
});
