import { useState } from "react";
import { api } from "../lib/api";
import Button from "./common/Button";

type Props = {
  scenarioId: string;
  floating?: boolean;
};

export default function ChatComponent({ scenarioId, floating = false }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const data = await api<{ answer: string }>(`/ai/scenarios/${scenarioId}/chat`, {
        method: "POST",
        body: JSON.stringify({ question })
      });
      setAnswer(data.answer);
    } finally {
      setLoading(false);
    }
  };

  const chatPanel = (
    <div className="stack" style={{ gap: 12 }}>
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #dbe4f0",
          minHeight: 140,
          boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)"
        }}
      >
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          AI response
        </div>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#1e293b", fontSize: 14 }}>
          {answer || "AI answers will appear here once you ask something."}
        </div>
      </div>

      {question ? (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "#0f172a",
            color: "#f8fafc",
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.14)"
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Your question</div>
          <div style={{ lineHeight: 1.6 }}>{question}</div>
        </div>
      ) : null}

      <div
        style={{
          padding: 14,
          borderRadius: 16,
          background: "linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%)",
          border: "1px solid #dbeafe"
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Ask AI
        </div>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={5}
          placeholder="Ask follow-up questions grounded in this scenario..."
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 14,
            padding: 12,
            background: "#ffffff",
            resize: "vertical"
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10 }}>
          {floating ? (
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="primary" onClick={() => void ask()} disabled={loading || !question.trim()}>
            {loading ? "Thinking..." : "Ask AI"}
          </Button>
        </div>
      </div>
    </div>
  );

  if (!floating) {
    return chatPanel;
  }

  return (
    <>
      <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1200 }}>
        <Button type="button" variant="primary" onClick={() => setOpen(true)} style={{ minWidth: 132 }}>
          Ask AI
        </Button>
      </div>

      {open ? (
        <div
          className="modal-overlay"
          onClick={() => setOpen(false)}
          style={{ zIndex: 1300, backdropFilter: "blur(10px)", background: "rgba(15, 23, 42, 0.3)" }}
        >
          <div
            className="card modal-card"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(760px, 100%)", padding: 24, boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  AI assistant
                </div>
                <h3 style={{ margin: "6px 0 0", color: "#1f2c3d", fontSize: 24 }}>What would you like to ask?</h3>
              </div>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            {chatPanel}
          </div>
        </div>
      ) : null}
    </>
  );
}
