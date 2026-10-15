import FeedSkeletonList from "@/components/post/PostSkeleton";

const ActivitySkeleton = ({ count = 6, activeTab = "followers" }) => {
    if (activeTab === "reposts") {
        return <FeedSkeletonList count={4} />;
    }

    return (
        <div className="w-full flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900/60 animate-pulse">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded-md w-32" />
                            <div className="h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-md w-44" />
                        </div>
                    </div>
                    <div className="w-22 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-xl shrink-0" />
                </div>
            ))}
        </div>
    );
};

export default ActivitySkeleton;
