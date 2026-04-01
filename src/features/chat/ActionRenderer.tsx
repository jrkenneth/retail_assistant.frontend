import { ActionButton, ActionButtonLink } from "./ActionButton";
import { ActionCard } from "./ActionCard";
import { ActionChart } from "./ActionChart";
import { ActionForm } from "./ActionForm";
import { ActionTable } from "./ActionTable";
import type { UiAction } from "./types";

type ActionRendererProps = {
  actions: UiAction[];
};

function extractArtifactActionInfo(action: UiAction): { artifactId: string; mode: "view" | "download" } | null {
  if (action.type !== "button" || !action.href) {
    return null;
  }

  const viewerMatch = action.href.match(/^\/viewer\/([^/]+)$/);
  if (viewerMatch) {
    return { artifactId: viewerMatch[1], mode: "view" };
  }

  const downloadMatch = action.href.match(/^\/artifacts\/([^/]+)\/download$/);
  if (downloadMatch) {
    return { artifactId: downloadMatch[1], mode: "download" };
  }

  return null;
}

function normalizeArtifactTitle(title: string): string {
  return title.replace(/^(View|Download)\s+/i, "").trim();
}

export function ActionRenderer({ actions }: ActionRendererProps) {
  if (!actions.length) {
    return null;
  }

  const rendered = actions.reduce<React.ReactNode[]>((items, action, index) => {
    const artifactInfo = extractArtifactActionInfo(action);
    if (artifactInfo?.mode === "view") {
      const matchingDownload = actions.find((candidate, candidateIndex) => {
        if (candidateIndex === index) {
          return false;
        }
        const candidateInfo = extractArtifactActionInfo(candidate);
        return candidateInfo?.artifactId === artifactInfo.artifactId && candidateInfo.mode === "download";
      });

      if (matchingDownload) {
        items.push(
          <article key={`artifact-group-${artifactInfo.artifactId}`} className="action-card">
            <h4>{normalizeArtifactTitle(action.title)}</h4>
            <p>{action.description ?? matchingDownload.description ?? "Open or download the generated document."}</p>
            <div className="action-button-row">
              <ActionButtonLink
                title={action.title}
                buttonLabel={action.buttonLabel}
                href={action.href}
              />
              <ActionButtonLink
                title={matchingDownload.title}
                buttonLabel={matchingDownload.buttonLabel}
                href={matchingDownload.href}
              />
            </div>
          </article>,
        );
        return items;
      }
    }

    if (artifactInfo?.mode === "download") {
      const hasMatchingView = actions.some((candidate, candidateIndex) => {
        if (candidateIndex === index) {
          return false;
        }
        const candidateInfo = extractArtifactActionInfo(candidate);
        return candidateInfo?.artifactId === artifactInfo.artifactId && candidateInfo.mode === "view";
      });
      if (hasMatchingView) {
        return items;
      }
    }

    if (action.type === "card") {
      items.push(<ActionCard key={action.id} title={action.title} description={action.description} />);
      return items;
    }

    if (action.type === "table") {
      items.push(
        <ActionTable
          key={action.id}
          title={action.title}
          columns={action.columns ?? []}
          rows={action.rows ?? []}
        />,
      );
      return items;
    }

    if (action.type === "chart") {
      items.push(
        <ActionChart
          key={action.id}
          title={action.title}
          chartType={action.chartType ?? "bar"}
          series={action.series ?? []}
        />,
      );
      return items;
    }

    if (action.type === "button") {
      items.push(
        <ActionButton
          key={action.id}
          title={action.title}
          description={action.description}
          buttonLabel={action.buttonLabel}
          href={action.href}
        />,
      );
      return items;
    }

    items.push(<ActionForm key={action.id} title={action.title} fields={action.fields ?? []} />);
    return items;
  }, []);

  return (
    <div className="action-stack">
      {rendered}
    </div>
  );
}
