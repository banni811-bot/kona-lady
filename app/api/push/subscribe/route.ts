
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { subscription } = await request.json();

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server is not configured" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userData.user.id,
          endpoint: subscription.endpoint,
          subscription,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

    if (error) {
      console.error("Push subscription save error:", error.message);

      return NextResponse.json(
        { error: "Could not save subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Could not process subscription" },
      { status: 500 },
    );
  }
}