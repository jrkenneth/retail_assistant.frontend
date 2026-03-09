import type { ToolTrace } from "./types";

type ToolTraceBlockProps = {
  traces: ToolTrace[];
};

export function ToolTraceBlock({ traces }: ToolTraceBlockProps) {
  if (!traces.length) {
    return null;
  }
  return (
    <p className="meta-line">
      Trace: {traces.map((item) => `${item.tool} ${item.status} (${item.latencyMs}ms)`).join(" | ")}
    </p>
  );
}
