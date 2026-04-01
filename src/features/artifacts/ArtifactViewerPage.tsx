import { useEffect, useMemo, useState } from "react";
import type { AuthenticatedUser } from "../auth/authApi";
import { downloadArtifactApi, fetchArtifactApi, fetchArtifactPreviewApi } from "../chat/chatApi";

type LoadState = "loading" | "ready" | "error";

type ViewerState = {
  status: LoadState;
  title: string;
  previewHtml: string;
  downloadUrl: string;
  fileName: string;
  artifactType: string;
  errorText: string;
};

const initialViewerState: ViewerState = {
  status: "loading",
  title: "Document Viewer",
  previewHtml: "",
  downloadUrl: "",
  fileName: "",
  artifactType: "",
  errorText: "",
};

function getArtifactIdFromPathname(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[1] ?? "";
}

type ArtifactViewerPageProps = {
  user: AuthenticatedUser;
  onLogout: () => Promise<void>;
};

export function ArtifactViewerPage({ user, onLogout }: ArtifactViewerPageProps) {
  const artifactId = useMemo(() => getArtifactIdFromPathname(window.location.pathname), []);
  const [viewer, setViewer] = useState<ViewerState>(initialViewerState);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!artifactId) {
        setViewer({
          ...initialViewerState,
          status: "error",
          errorText: "Missing artifact id.",
        });
        return;
      }
      try {
        const payload = await fetchArtifactApi(artifactId);
        if (cancelled) return;
        if (!payload.has_preview || !payload.preview_url) {
          setViewer({
            ...initialViewerState,
            status: "error",
            errorText: "Preview is not available for this document.",
          });
          return;
        }
        const previewHtml = await fetchArtifactPreviewApi(payload.preview_url);
        if (cancelled) return;
        setViewer({
          status: "ready",
          title: payload.title || "Document Viewer",
          artifactType: payload.artifact_type.toUpperCase(),
          previewHtml,
          downloadUrl: payload.download_url ?? "",
          fileName: payload.file_name ?? `${payload.title || "document"}.${payload.artifact_type}`,
          errorText: "",
        });
      } catch {
        if (cancelled) return;
        setViewer({
          ...initialViewerState,
          status: "error",
          errorText: "Failed to load document preview.",
        });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [artifactId]);

  return (
    <main className="viewer-page">
      <header className="viewer-header">
        <div>
          <h1>{viewer.title}</h1>
          <p>{user.full_name}</p>
        </div>
        <div className="viewer-actions">
          <a className="catalog-link" href="/chat">Back to Chat</a>
          <a className="secondary-link" href="/access-requests">Access Requests</a>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => { void onLogout(); }}
          >
            Log out
          </button>
          {viewer.downloadUrl ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { void downloadArtifactApi(viewer.downloadUrl, viewer.fileName); }}
            >
              Download {viewer.artifactType || "Document"}
            </button>
          ) : null}
        </div>
      </header>

      {viewer.status === "loading" ? <p>Loading document preview...</p> : null}
      {viewer.status === "error" ? <p className="error-text">{viewer.errorText}</p> : null}
      {viewer.status === "ready" ? (
        <section className="viewer-canvas">
          <iframe title={viewer.title} srcDoc={viewer.previewHtml} className="viewer-frame" />
        </section>
      ) : null}
    </main>
  );
}
