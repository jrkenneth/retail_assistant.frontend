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
      <h4>You do not currently have permission to view this data.</h4>
      <p>
        If you need this information to do your job, you can raise an access request for review or check the status of previous requests.
      </p>
      <div className="action-button-row">
        <button
          type="button"
          className="primary-btn"
          onClick={() => onOpenAccessRequest(suggestedResource)}
        >
          Raise access request
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
