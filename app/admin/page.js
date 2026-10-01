"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Admin() {
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [instagram, setInstagram] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jungle_follow_admin");

    if (token) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  async function login(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("login_admin", {
      p_kakao_nickname: nickname,
      p_instagram_id: instagram,
      p_pin: pin,
    });

    if (error) {
      setMessage("관리자 정보 또는 PIN을 확인해주세요.");
      setLoading(false);
      return;
    }

    const row = data?.[0];

    if (row?.session_token) {
      localStorage.setItem(
        "jungle_follow_admin",
        row.session_token
      );

      router.replace("/admin/dashboard");
      return;
    }

    setMessage("관리자 로그인에 실패했어요.");
    setLoading(false);
  }

  return (
    <main className="page">
      <section className="card">

        <div className="badge">ADMIN</div>

        <div className="mark">🔐</div>

        <h1>관리자 로그인</h1>

        <p className="sub">
          정글맞팔웹 관리
        </p>

        <form onSubmit={login}>

          <label>카톡방 닉네임</label>

          <input
            value={nickname}
            onChange={(e) =>
              setNickname(e.target.value)
            }
            required
          />

          <label>인스타 아이디</label>

          <input
            value={instagram}
            onChange={(e) =>
              setInstagram(e.target.value)
            }
            required
          />

          <label>관리자 PIN</label>

          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value)
            }
            required
          />

          <button disabled={loading}>
            {loading
              ? "확인 중..."
              : "관리자 로그인"}
          </button>

        </form>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

        <a
          className="admin"
          href="/"
        >
          ← 회원 로그인
        </a>

      </section>
    </main>
  );
}
