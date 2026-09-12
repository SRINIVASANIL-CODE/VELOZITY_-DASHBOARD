import { asyncHandler } from "../utils/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import * as dashboardService from "../services/dashboardService";
import { getOnlineCount } from "../sockets";
import { Role } from "@prisma/client";

export const getDashboard = asyncHandler(async (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.role === Role.ADMIN) {
    res.json(await dashboardService.adminDashboard(getOnlineCount()));
  } else if (user.role === Role.PROJECT_MANAGER) {
    res.json(await dashboardService.pmDashboard(user));
  } else {
    res.json(await dashboardService.developerDashboard(user));
  }
});
