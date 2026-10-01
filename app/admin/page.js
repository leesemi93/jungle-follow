"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const memberToken =
      localStorage.getItem("jungle_follow_session");

    if (memberToken) {
      router.replace("/admin/dashboard");
      return;
    }

    router.replace("/");
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f7f5ed",
        padding: "24px",
      }}
    >
      <div
        style={{
          padding: "28px",
          borderRadius: "24px",
          background: "#ffffff",
          color: "#607052",
          fontSize: "13px",
          fontWeight: "900",
          textAlign: "center",
        }}
      >
        🐯 관리자 권한 확인 중...
      </div>
    </main>
  );
}
