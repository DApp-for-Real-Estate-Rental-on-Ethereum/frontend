
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    const { tenantId } = await params;
    const ML_API_URL = process.env.AI_API_URL || "http://localhost:8002"; // Use K8s DNS or localhost default

    try {
        const response = await fetch(`${ML_API_URL}/tenant-risk/${tenantId}`, {
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
