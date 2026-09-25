import { saveCache } from "./cache";
import { MARKER, templatePath, YEAR_MARKER } from "./config";
import { loadProjects } from "./projects";
import { renderProject, resolveProject } from "./render";

export { root } from "./config";

export async function renderPage(): Promise<string> {
    const [template, projects] = await Promise.all([Bun.file(templatePath).text(), loadProjects()]);
    if (!template.includes(MARKER)) throw new Error(`index.html is missing the ${MARKER} marker`);
    const resolved = await Promise.all(projects.map(resolveProject));
    await saveCache();
    return template
        .replace(MARKER, () =>
            resolved
                .filter((p) => p !== null)
                .map(renderProject)
                .join("\n"),
        )
        .replaceAll(YEAR_MARKER, String(new Date().getFullYear()));
}
