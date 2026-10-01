import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();

    const sessionToken = body?.sessionToken;
    const title = String(body?.title || "").trim();
    const message = String(body?.message || "").trim();
    const url = String(body?.url || "/member").trim();

    if (!sessionToken) {
      return NextResponse.json(
        { error: "관리자 로그인이 필요합니다." },
        { status: 401 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: "알림 제목과 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const privateKey =
      process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return NextResponse.json(
        {
          error:
            "VAPID 환경변수가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(
      "mailto:admin@jungle-follow.local",
      publicKey,
      privateKey
    );

    const { data: subscriptions, error } =
      await supabase.rpc(
        "admin_get_push_subscriptions",
        {
          p_session_token: sessionToken,
        }
      );

    if (error) {
      console.error(
        "admin_get_push_subscriptions:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "알림 발송 대상을 불러오지 못했습니다.",
        },
        { status: 500 }
      );
    }

    const targets = Array.isArray(subscriptions)
      ? subscriptions
      : [];

    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        total: 0,
        message:
          "알림을 받을 수 있도록 등록된 회원이 없습니다.",
      });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/jungle-follow-hero.png",
      badge: "/jungle-follow-hero.png",
      url,
      tag: "jungle-follow-admin",
    });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      targets.map(async (target) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: target.endpoint,
              keys: {
                p256dh: target.p256dh,
                auth: target.auth,
              },
            },
            payload
          );

          sent += 1;
        } catch (error) {
          failed += 1;

          console.error(
            "push send failed:",
            target.subscription_id,
            error?.statusCode,
            error?.message
          );
        }
      })
    );

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: targets.length,
    });
  } catch (error) {
    console.error(
      "push API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "알림 발송 중 문제가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
