import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  // TODO: replace with actual Portal SDK call when API key is configured
  const portalApiKey = process.env.NEXT_PUBLIC_PORTAL_API_KEY;

  if (!portalApiKey || portalApiKey === "your_portal_api_key_here") {
    // Return a mock success so the UI can be tested without real credentials
    return NextResponse.json({
      sessionId,
      mock: true,
      message: "Portal API key not configured — returning mock session",
    });
  }

  // Real Portal session creation goes here
  // const session = await portalClient.sessions.create({ id: sessionId });
  return NextResponse.json({ sessionId });
}
