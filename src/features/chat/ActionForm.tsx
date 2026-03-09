type ActionFormProps = {
  title: string;
  fields: string[];
};

export function ActionForm({ title, fields }: ActionFormProps) {
  return (
    <article className="action-card">
      <h4>{title}</h4>
      <ul className="field-list">
        {fields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </article>
  );
}
