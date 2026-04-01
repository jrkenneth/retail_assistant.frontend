type ActionTableProps = {
  title: string;
  columns: string[];
  rows: Array<Record<string, string>>;
};

export function ActionTable({ title, columns, rows }: ActionTableProps) {
  return (
    <article className="action-card">
      <h4>{title}</h4>
      <div className="result-scroll-shell">
        <div className="table-wrap" role="region" aria-label={`${title} table`}>
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${title}-${idx}`}>
                  {columns.map((column) => (
                    <td key={`${idx}-${column}`}>{row[column] ?? "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
