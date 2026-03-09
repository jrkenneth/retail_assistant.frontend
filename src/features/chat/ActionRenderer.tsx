import { ActionButton } from "./ActionButton";
import { ActionCard } from "./ActionCard";
import { ActionChart } from "./ActionChart";
import { ActionForm } from "./ActionForm";
import { ActionTable } from "./ActionTable";
import type { UiAction } from "./types";

type ActionRendererProps = {
  actions: UiAction[];
};

export function ActionRenderer({ actions }: ActionRendererProps) {
  if (!actions.length) {
    return null;
  }

  return (
    <div className="action-stack">
      {actions.map((action) => {
        if (action.type === "card") {
          return <ActionCard key={action.id} title={action.title} description={action.description} />;
        }

        if (action.type === "table") {
          return (
            <ActionTable
              key={action.id}
              title={action.title}
              columns={action.columns ?? []}
              rows={action.rows ?? []}
            />
          );
        }

        if (action.type === "chart") {
          return (
            <ActionChart
              key={action.id}
              title={action.title}
              chartType={action.chartType ?? "bar"}
              series={action.series ?? []}
            />
          );
        }

        if (action.type === "button") {
          return (
            <ActionButton
              key={action.id}
              title={action.title}
              description={action.description}
              buttonLabel={action.buttonLabel}
              href={action.href}
            />
          );
        }

        return <ActionForm key={action.id} title={action.title} fields={action.fields ?? []} />;
      })}
    </div>
  );
}
