import { useEffect, useState } from "react";

type AccessRequestModalProps = {
  isOpen: boolean;
  suggestedResource?: string;
  onClose: () => void;
  onSubmit: (resourceRequested: string, justification: string) => Promise<void>;
};

export function AccessRequestModal({
  isOpen,
  suggestedResource,
  onClose,
  onSubmit,
}: AccessRequestModalProps) {
  const [resourceRequested, setResourceRequested] = useState("");
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setResourceRequested(suggestedResource ?? "");
    setJustification("");
    setError("");
  }, [isOpen, suggestedResource]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit(resourceRequested.trim(), justification.trim());
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create access request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rename-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="rename-modal access-request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-request-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="access-request-title" className="rename-modal-title">Raise access request</h2>
        <p className="access-request-copy">
          Confirm the resource you need and add a short justification. Your request will be submitted for review.
        </p>
        <form className="access-request-form" onSubmit={(event) => { void handleSubmit(event); }}>
          <label className="login-label">
            Resource requested
            <input
              className="rename-modal-input"
              value={resourceRequested}
              onChange={(event) => setResourceRequested(event.target.value)}
              placeholder="Payroll details for Finance department"
              disabled={isSubmitting}
            />
          </label>

          <label className="login-label">
            Justification
            <textarea
              className="rename-modal-input access-request-textarea"
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Explain why you need this access."
              rows={4}
              disabled={isSubmitting}
            />
          </label>

          {error ? <p className="login-error">{error}</p> : null}

          <div className="rename-modal-actions">
            <button type="button" className="secondary-btn access-request-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
