"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [instagram, setInstagram] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("login_member", {
      p_kakao_nickname: nickname,
      p_instagram_id: instagram,
    });

    if (error) {
      setMessage(
        error.message.includes("일치")
          ? "등록된 회원정보와 일치하지 않아요."
          : "로그인 중 오류가 발생했어요."
      );
      setLoading(false);
      return;
    }

    const row = data?.[0];

    if (row?.session_token) {
      localStorage.setItem("jungle_follow_session", row.session_token);
      localStorage.setItem("jungle_follow_name", row.kakao_nickname);
      setMessage(`${row.kakao_nickname}님, 로그인되었어요 🌿`);
    }

    setLoading(false);
  }

  return (
    <main className="page">
      <section className="card">
        <div className="badge">JUNGLE FOLLOW DAY</div>
        <div className="mark">🌿</div>
        <h1>정글맞팔웹</h1>
        <p className="sub">매달 만나는 우리들의 맞팔데이</p>

        <form onSubmit={login}>
          <label>카톡방 닉네임</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="카톡방 닉네임을 입력해주세요"
            required
          />

          <label>인스타 아이디</label>
          <div className="inputWrap">
            <span>@</span>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="인스타 아이디"
              required
            />
          </div>

          <button disabled={loading}>
            {loading ? "로그인 중..." : "로그인하기"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}
        <p className="notice">관리자에게 등록된 회원만 이용할 수 있어요.</p>
        <a className="admin" href="/admin">관리자 로그인 →</a>
      </section>
      <p className="foot">🐯 정글룸 맞팔데이</p>
    </main>
  );
}
