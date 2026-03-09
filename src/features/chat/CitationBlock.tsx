type CitationBlockProps = {
  citations: string[];
};

export function CitationBlock({ citations }: CitationBlockProps) {
  if (!citations.length) {
    return null;
  }
  return <p className="meta-line">Citations: {citations.join(", ")}</p>;
}
