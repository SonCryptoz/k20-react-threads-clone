import { SkeletonBlock } from "@/components/ui/skeleton";

export function PostSkeleton() {
    return (
        <div className="w-full p-4 border-b border-neutral-100 dark:border-neutral-800/70 flex gap-3">
            {/* Avatar placeholder */}
            <SkeletonBlock className="w-10 h-10 rounded-full shrink-0" />

            {/* Nội dung bài viết placeholder */}
            <div className="flex-1 space-y-2.5 pt-0.5">
                <div className="flex items-center justify-between">
                    <SkeletonBlock className="w-28 h-4" />
                    <SkeletonBlock className="w-10 h-3" />
                </div>
                <SkeletonBlock className="w-full h-4" />
                <SkeletonBlock className="w-3/4 h-4" />

                {/* Interaction bar placeholder */}
                <div className="flex items-center gap-4 pt-2">
                    <SkeletonBlock className="w-5 h-5 rounded-md" />
                    <SkeletonBlock className="w-5 h-5 rounded-md" />
                    <SkeletonBlock className="w-5 h-5 rounded-md" />
                    <SkeletonBlock className="w-5 h-5 rounded-md" />
                </div>
            </div>
        </div>
    );
}

export function FeedSkeletonList({ count = 4 }) {
    return (
        <div className="w-full divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {Array.from({ length: count }).map((_, index) => (
                <PostSkeleton key={index} />
            ))}
        </div>
    );
}

export default FeedSkeletonList;
