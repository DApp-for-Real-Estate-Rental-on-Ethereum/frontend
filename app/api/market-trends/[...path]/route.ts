import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        // Use Gateway URL in production (K8s), fallback to direct AI service for local dev
        const GATEWAY_URL = process.env.AI_API_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8002";

        const { path } = await params;
        const pathString = path.join("/");
        const searchParams = request.nextUrl.searchParams.toString();
        const targetUrl = `${GATEWAY_URL}/api/market-trends/${pathString}${searchParams ? `?${searchParams}` : ""}`;

        const response = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`ML API Error (${response.status}): ${errorText}`);
            return NextResponse.json(
                { error: `ML Service Error: ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
