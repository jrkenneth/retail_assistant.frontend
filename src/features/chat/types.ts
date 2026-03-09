export type UserRole = "admin" | "agent" | "viewer";

export type MessageRole = "user" | "assistant";

export type UiActionType = "card" | "table" | "chart" | "button" | "form";

export type ChartSeries = {
  name: string;
  data: Array<{ label: string; value: number }>;
};

export type UiAction = {
  id: string;
  type: UiActionType;
  title: string;
  description?: string;
  // table
  columns?: string[];
  rows?: Array<Record<string, string>>;
  // chart
  chartType?: "bar" | "line" | "pie";
  series?: ChartSeries[];
  // button
  buttonLabel?: string;
  href?: string;
  // form
  fields?: string[];
};

export type ToolTrace = {
  tool: string;
  latencyMs: number;
  status: "success" | "blocked" | "error";
};

export type Citation = {
  label: string;   // source name e.g. "Wikipedia", "Al Jazeera"
  source: string;  // article title / headline
  uri?: string;    // URL to open
  image?: string;  // thumbnail image URL
};

export type ChatResponse = {
  message_text: string;
  ui_actions: UiAction[];
  citations: Citation[];
  tool_trace: ToolTrace[];
  errors: string[];
  summary?: string;
  follow_up?: string;
  showSources?: boolean;
};

export type MessageAlternative = {
  text: string;
  uiActions?: UiAction[];
  citations?: Citation[];
  summary?: string;
  follow_up?: string;
  showSources?: boolean;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
  uiActions?: UiAction[];
  citations?: Citation[];
  toolTrace?: ToolTrace[];
  errors?: string[];
  summary?: string;
  follow_up?: string;
  showSources?: boolean;
  // Multi-alternative navigation ("try again")
  alternatives?: MessageAlternative[];
  currentAlternativeIndex?: number;
  // Set during an active retry stream — undefined means not retrying
  streamingText?: string;
};

export type ChatSession = {
  id: string;
  name: string;
  role: UserRole;
  updatedAt: string;
  messages: ChatMessage[];
};
