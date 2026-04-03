import { auth } from "@/lib/auth"; // Import the auth instance you created
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
