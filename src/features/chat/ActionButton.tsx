import { downloadArtifactApi } from "./chatApi";
import { resolveActionHref } from "../../utils/urlHelpers";

export type ActionButtonProps = {
  title?: string;
  description?: string;
  buttonLabel?: string;
  href?: string;
};

export function ActionButtonLink({ title, buttonLabel, href }: ActionButtonProps) {
  const resolvedHref = resolveActionHref(href);
  const isProtectedDownload = Boolean(href?.startsWith("/artifacts/") && href.endsWith("/download"));

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isProtectedDownload || !href) {
      return;
    }
    e.preventDefault();
    const fallbackName = `${(title ?? buttonLabel ?? "document").replace(/\s+/g, "-").toLowerCase() || "document"}`;
    await downloadArtifactApi(href, fallbackName);
  };

  if (resolvedHref) {
    return (
      <a
        href={resolvedHref}
        target={isProtectedDownload ? undefined : "_blank"}
        rel={isProtectedDownload ? undefined : "noreferrer"}
        className="secondary-link"
        onClick={(e) => { void handleClick(e); }}
      >
        {buttonLabel ?? "Action"}
      </a>
    );
  }

  return (
    <button type="button" className="secondary-btn">
      {buttonLabel ?? "Action"}
    </button>
  );
}

export function ActionButton({ title, description, buttonLabel, href }: ActionButtonProps) {
  return (
    <article className="action-card">
      {title ? <h4>{title}</h4> : null}
      {description ? <p>{description}</p> : null}
      <ActionButtonLink title={title} buttonLabel={buttonLabel} href={href} />
    </article>
  );
}
