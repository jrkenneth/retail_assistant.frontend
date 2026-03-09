type ActionCardProps = {
  title: string;
  description?: string;
};

export function ActionCard({ title, description }: ActionCardProps) {
  return (
    <article className="action-card">
      <h4>{title}</h4>
      {description ? <p>{description}</p> : null}
    </article>
  );
}
