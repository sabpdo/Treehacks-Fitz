import { formatPostTime } from "../../data/mockData";
import type { Comment as CommentType } from "../../data/mockData";
import { useAppStore } from "../../context/AppStore";
import { cn } from "../ui/utils";

function CommentItem({ comment }: { comment: CommentType }) {
  const { getUser } = useAppStore();
  const user = getUser(comment.userId);
  return (
    <div className="flex gap-3 py-3">
      <img
        src={user?.avatarUrl ?? ""}
        alt={user?.name ?? ""}
        className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-neutral-900">
            {user?.name ?? user?.handle ?? "Unknown"}
          </span>
          <span className="text-[10px] text-neutral-400">
            {formatPostTime(comment.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-neutral-600">{comment.text}</p>
      </div>
    </div>
  );
}

type CommentListProps = {
  comments: CommentType[];
  emptyMessage?: string;
  className?: string;
};

export function CommentList({
  comments,
  emptyMessage = "No comments yet.",
  className,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div
        className={cn(
          "py-8 text-center text-sm text-neutral-400",
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("divide-y divide-neutral-100", className)}>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
