import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Credentials
  TSME_EMAIL: z.email().min(3, "TSME_EMAIL is required").optional(),
  TSME_PASSWORD: z.string().min(3, "TSME_PASSWORD is required").optional(),
});

// Validation
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  const prettyErrors = z.prettifyError(parsedEnv.error);
  console.error("❌ Invalid environment variables:");
  console.error(prettyErrors);
  process.exit(1);
}

export default parsedEnv.data;
