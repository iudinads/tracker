import { TaskStatus } from "@/lib/types";

const statusStyles: Record<TaskStatus, string> = {
  backlog: "bg-neutral-100 text-neutral-600",
  in_progress: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-500 line-through",
};

const statusLabels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
