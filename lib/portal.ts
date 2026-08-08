import { Portal } from "@portalsdk/core";

const apiKey = process.env.NEXT_PUBLIC_PORTAL_KEY;
if (!apiKey) throw new Error("NEXT_PUBLIC_PORTAL_KEY is not set");

export const portalClient = new Portal({ apiKey });
