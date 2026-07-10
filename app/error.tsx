"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "40px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.4rem", margin: 0 }}>
        データの読み込みに失敗しました
      </h1>
      <p style={{ maxWidth: "520px", lineHeight: 1.7, opacity: 0.8 }}>
        data/workspace 配下のファイルが破損しているか、読み込めない可能性があります。
        該当ファイルを確認してから再試行してください。
      </p>
      <pre
        style={{
          maxWidth: "620px",
          width: "100%",
          overflowX: "auto",
          padding: "12px 16px",
          borderRadius: "10px",
          background: "rgba(127,127,127,0.12)",
          fontSize: "0.82rem",
          textAlign: "left",
        }}
      >
        {error.message}
      </pre>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "10px 20px",
          borderRadius: "10px",
          border: "1px solid rgba(127,127,127,0.35)",
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
      >
        再試行
      </button>
    </main>
  );
}
