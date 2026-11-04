import { sampleBundle } from "@/lib/mock";
import { withLook } from "../preview-kit";
import { manifest } from "./manifest";

/** Carmela Reyes-Tan, the seed card this template was designed around. */
export const preview = withLook(sampleBundle(), { templateId: manifest.id });
