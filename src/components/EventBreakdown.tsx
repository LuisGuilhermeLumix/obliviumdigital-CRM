import { EVENT_CONFIG, EventKey } from "@/lib/eventLabels";

interface BreakdownItem {
  eventKey: EventKey;
  value: string | number;
}

interface EventBreakdownProps {
  items: BreakdownItem[];
}

export function EventBreakdown({ items }: EventBreakdownProps) {
  return (
    <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
      {items.map(({ eventKey, value }) => {
        const cfg = EVENT_CONFIG[eventKey];
        return (
          <div key={eventKey} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-gray-400">{cfg.label}</span>
            </div>
            <span className="text-gray-300 font-medium">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
