
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const pathString = path.join("/");

    // Use Gateway URL in production (K8s), fallback to direct AI service for local dev
    const GATEWAY_URL = process.env.AI_API_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8002";

    // Capture query parameters from the original request
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : "";

    // AI Service (pricing-api)
    const targetUrl = `${GATEWAY_URL}/api/recommendations/${pathString}${queryString}`;

    try {
        const response = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            // duplex: "half" is not strictly needed for GET (no body), but harmless to omit
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `ML Service Error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Proxy error:", error);
        return NextResponse.json(
            { error: "Failed to connect to ML service" },
            { status: 500 }
        );
    }
}
