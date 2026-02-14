import type { RankedItem } from "../../data/mockData";
import { Badge } from "./Badge";
import { cn } from "../ui/utils";

type RankingListProps = {
  items: RankedItem[];
  groupByCategory?: boolean;
  emptyMessage?: string;
  className?: string;
};

function RankedItemCard({ item }: { item: RankedItem }) {
  return (
    <div className="flex gap-4 rounded-xl border border-neutral-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-50">
        <img
          src={item.imageUrl}
          alt={item.brand}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-neutral-400">
          {item.category}
        </p>
        <p className="font-medium text-neutral-900">{item.brand}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <Badge variant="muted">{item.vibeTag}</Badge>
          <span className="text-xs text-neutral-500">{item.priceTier}</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-center">
        <p className="font-serif text-2xl text-neutral-900">{item.rating}</p>
        <p className="text-[10px] uppercase text-neutral-400">Rating</p>
      </div>
    </div>
  );
}

export function RankingList({
  items,
  groupByCategory = true,
  emptyMessage = "No ranked items yet.",
  className,
}: RankingListProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white/50 py-12 text-center",
          className
        )}
      >
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  if (!groupByCategory) {
    return (
      <div className={cn("space-y-3", className)}>
        {items.map((item) => (
          <RankedItemCard key={item.id} item={item} />
        ))}
      </div>
    );
  }

  const byCategory = items.reduce<Record<string, RankedItem[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className={cn("space-y-6", className)}>
      {Object.entries(byCategory).map(([category, list]) => (
        <div key={category}>
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            {category}
          </h4>
          <div className="space-y-3">
            {list.map((item) => (
              <RankedItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
