import { asyncHandler } from "../utils/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import * as projectService from "../services/projectService";

export const listProjects = asyncHandler(async (req: AuthedRequest, res) => {
  const projects = await projectService.listProjects(req.user!);
  res.json({ projects });
});

export const getProject = asyncHandler(async (req: AuthedRequest, res) => {
  const project = await projectService.getProjectOrThrow(req.params.id, req.user!);
  res.json({ project });
});

export const createProject = asyncHandler(async (req: AuthedRequest, res) => {
  const project = await projectService.createProject(req.user!, req.body);
  res.status(201).json({ project });
});
