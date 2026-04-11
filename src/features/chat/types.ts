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

export type PolicyCitation = {
  policy_title: string;
  excerpt: string;
};

export type QuickAction = {
  label: string;
  prompt: string;
};

export type ProductCardPayload = {
  sku: string;
  name: string;
  price: number;
  original_price?: number;
  availability_status: string;
  is_promotion_eligible: boolean;
  warranty_duration: string;
  return_window_days: number;
  specifications: Record<string, string>;
  image_url?: string;
  rating?: number;
  review_count?: number;
};

export type OrderCardPayload = {
  order_number: string;
  order_date: string;
  status: string;
  delivery_status: string;
  tracking_number?: string;
  estimated_delivery_date?: string;
  refund_status?: string;
  items: { name: string; quantity: number; unit_price: number }[];
  can_initiate_return: boolean;
};

export type EscalationPayload = {
  ticket_number: string;
  estimated_wait_minutes: number;
  queue_position: number;
  case_summary: string;
  actions_completed: { label: string; detail: string }[];
};

export type RefusalPayload = {
  reason: string;
  policy_title: string;
  policy_bullets: string[];
  order_context?: {
    order_number: string;
    product_name: string;
    delivered_date: string;
  };
};

export type LoyaltyPayload = {
  current_balance: number;
  tier?: string;
  recent_transactions: { date: string; description: string; points: number; type: string }[];
};

export type TypedResponsePayload =
  | ProductCardPayload
  | OrderCardPayload
  | EscalationPayload
  | RefusalPayload
  | LoyaltyPayload;

export type ChatResponse = {
  response_type: "text" | "product_card" | "order_card" | "escalation" | "refusal" | "loyalty_card";
  message: string;
  message_text: string;
  confidence_score?: number;
  payload?: TypedResponsePayload;
  policy_citations?: PolicyCitation[];
  quick_actions?: QuickAction[];
  ui_actions: UiAction[];
  citations: Citation[];
  tool_trace: ToolTrace[];
  errors: string[];
  summary?: string;
  follow_up?: string;
  showSources?: boolean;
  // Returned on the first message only — client should rename the session.
  session_title?: string;
};

export type MessageAlternative = {
  text: string;
  responseType?: ChatResponse["response_type"];
  confidenceScore?: number;
  payload?: TypedResponsePayload;
  policyCitations?: PolicyCitation[];
  quickActions?: QuickAction[];
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
  responseType?: ChatResponse["response_type"];
  confidenceScore?: number;
  payload?: TypedResponsePayload;
  policyCitations?: PolicyCitation[];
  quickActions?: QuickAction[];
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
  closedAt?: string | null;
  messages: ChatMessage[];
};
