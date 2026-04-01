type AccessDeniedCardProps = {
  suggestedResource?: string;
  onOpenAccessRequest: (suggestedResource?: string) => void;
  onViewAccessRequests: () => void;
};

export function AccessDeniedCard({
  suggestedResource,
  onOpenAccessRequest,
  onViewAccessRequests,
}: AccessDeniedCardProps) {
  return (
    <section className="access-denied-card">
      <div className="access-denied-badge">Access restricted</div>
      <h4>This request could not be completed automatically.</h4>
      <p>
        You can raise a support escalation for manual review or check the status of earlier escalation requests.
      </p>
      <div className="action-button-row">
        <button
          type="button"
          className="primary-btn"
          onClick={() => onOpenAccessRequest(suggestedResource)}
        >
          Raise escalation
        </button>
        <button
          type="button"
          className="secondary-btn access-request-secondary"
          onClick={onViewAccessRequests}
        >
          View request history
        </button>
      </div>
    </section>
  );
}
