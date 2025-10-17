import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const response = await fetch("http://localhost:8000/candidate/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      return NextResponse.json({ message: "Profile created successfully" });
    } else {
      console.error("Failed to create profile:", response.statusText);
      return NextResponse.json({ error: "Failed to create profile" }, { status: response.status });
    }
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json({ error: "Error creating profile" }, { status: 500 });
  }
}
