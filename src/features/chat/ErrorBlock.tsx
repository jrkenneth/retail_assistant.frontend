type ErrorBlockProps = {
  errors: string[];
};

export function ErrorBlock({ errors }: ErrorBlockProps) {
  if (!errors.length) {
    return null;
  }
  return <p className="meta-line error-text">Errors: {errors.join(", ")}</p>;
}
