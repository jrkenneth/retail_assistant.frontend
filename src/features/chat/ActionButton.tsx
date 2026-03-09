type ActionButtonProps = {
  title: string;
  description?: string;
  buttonLabel?: string;
  href?: string;
};

export function ActionButton({ title, description, buttonLabel, href }: ActionButtonProps) {
  return (
    <article className="action-card">
      <h4>{title}</h4>
      {description ? <p>{description}</p> : null}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="secondary-link">
          {buttonLabel ?? "Action"}
        </a>
      ) : (
        <button type="button" className="secondary-btn">
          {buttonLabel ?? "Action"}
        </button>
      )}
    </article>
  );
}
