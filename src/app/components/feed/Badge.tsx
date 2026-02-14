import { cn } from "../ui/utils";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "muted" | "accent";
};

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        variant === "default" && "border border-neutral-200/80 bg-white/90 text-neutral-700",
        variant === "muted" && "bg-neutral-100 text-neutral-500",
        variant === "accent" && "bg-[#8B9B8E]/10 text-[#8B9B8E]",
        className
      )}
    >
      {children}
    </span>
  );
}
