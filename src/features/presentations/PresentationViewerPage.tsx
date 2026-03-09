import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";
import {
  exportPresentationApi,
  fetchPresentationApi,
} from "../chat/chatApi";

type LoadState = "loading" | "ready" | "error";

function getPresentationIdFromPathname(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[1] ?? "";
}

export function PresentationViewerPage() {
  const presentationId = useMemo(
    () => getPresentationIdFromPathname(window.location.pathname),
    [],
  );
  const [state, setState] = useState<LoadState>("loading");
  const [title, setTitle] = useState("Presentation Viewer");
  const [html, setHtml] = useState("");
  const [errorText, setErrorText] = useState("");
  const [exportFormat, setExportFormat] = useState<"pdf" | "pptx">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [exportNote, setExportNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!presentationId) {
        setState("error");
        setErrorText("Missing presentation id.");
        return;
      }
      try {
        const payload = await fetchPresentationApi(presentationId);
        if (cancelled) return;
        setTitle(payload.title || "Presentation Viewer");
        setHtml(payload.html_content);
        setState("ready");
      } catch {
        if (cancelled) return;
        setState("error");
        setErrorText("Failed to load presentation.");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [presentationId]);

  const handleExport = async () => {
    if (!presentationId || isExporting) return;
    setIsExporting(true);
    setExportNote("");
    try {
      const payload = await exportPresentationApi(presentationId, exportFormat);
      if (payload.note) {
        setExportNote(payload.note);
      }
      const downloadUrl = payload.download_url.startsWith("http")
        ? payload.download_url
        : `${API_BASE_URL}${payload.download_url.startsWith("/") ? "" : "/"}${payload.download_url}`;
      window.location.href = downloadUrl;
    } catch (error) {
      setExportNote(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="viewer-page">
      <header className="viewer-header">
        <h1>{title}</h1>
        <div className="viewer-actions">
          <a className="catalog-link" href="/chat">Back to Chat</a>
          <select
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value as "pdf" | "pptx")}
            disabled={isExporting}
          >
            <option value="pdf">PDF</option>
            <option value="pptx">PPTX</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={handleExport} disabled={isExporting || state !== "ready"}>
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </header>

      {exportNote ? <p className="meta-line">{exportNote}</p> : null}

      {state === "loading" ? <p>Loading presentation...</p> : null}
      {state === "error" ? <p className="error-text">{errorText}</p> : null}
      {state === "ready" ? (
        <section className="viewer-canvas">
          <iframe title={title} srcDoc={html} className="viewer-frame" />
        </section>
      ) : null}
    </main>
  );
}
