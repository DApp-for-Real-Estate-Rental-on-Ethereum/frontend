import { NextRequest, NextResponse } from "next/server";

// Configuration for the ML Service
const ML_SERVICE_URL = "http://localhost:8002";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const pathString = path.join("/");
        const searchParams = request.nextUrl.searchParams.toString();
        const targetUrl = `${ML_SERVICE_URL}/market-trends/${pathString}${searchParams ? `?${searchParams}` : ""}`;

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
