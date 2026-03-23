import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    registryUrl:
      process.env.RULEKIT_REGISTRY_URL || "http://localhost:8080",
  });
}
