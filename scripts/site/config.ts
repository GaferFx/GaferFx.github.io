import { resolve } from "node:path";

export const root = resolve(import.meta.dir, "..", "..");
export const templatePath = resolve(root, "index.html");
export const projectsPath = resolve(root, "projects.yml");
export const thumbnailsDir = resolve(root, "public", "thumbnails");
export const MARKER = "<!--PROJECTS-->";
export const YEAR_MARKER = "{{BUILD_YEAR}}";
