import type { FeedbackItem } from "@/src/state/workbench";

interface FeedbackPanelProps {
  feedback: readonly FeedbackItem[];
}

export function FeedbackPanel({ feedback }: FeedbackPanelProps) {
  return (
    <section className="panel-section" aria-labelledby="feedback-title">
      <div className="section-heading">
        <span className="step-number">05</span>
        <h2 id="feedback-title">即时反馈</h2>
      </div>
      <div className="feedback-list" aria-live="polite">
        {feedback.map((item) => (
          <div className={`feedback-item ${item.kind}`} key={item.id}>
            {item.message}
          </div>
        ))}
      </div>
    </section>
  );
}
