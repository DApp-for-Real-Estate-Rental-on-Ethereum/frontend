
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    const { tenantId } = await params;

    // Use Gateway URL in production (K8s), fallback to direct AI service for local dev
    // AI_API_URL in K8s points to Gateway, Gateway routes /api/tenant-risk/** to pricing-api
    const GATEWAY_URL = process.env.AI_API_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8002";

    try {
        // AI Service (pricing-api) expects /api prefix
        const fullUrl = `${GATEWAY_URL}/api/tenant-risk/${tenantId}`;

        const response = await fetch(fullUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // Forward body if any. "duplex" is required when body is a stream (NextRequest.body)
            body: request.body,
            // @ts-ignore - duplex is a valid option in Node.js fetch but TS might not know it
            duplex: "half",
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            return NextResponse.json(
                { error: `ML Service Error: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Proxy error:", error);
        return NextResponse.json(
            { error: `Failed to connect to ML service: ${error.message}` },
            { status: 500 }
        );
    }
}
