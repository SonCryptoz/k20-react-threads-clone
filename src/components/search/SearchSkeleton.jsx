const SearchSkeleton = ({ count = 6 }) => {
    return (
        <div className="flex flex-col w-full">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-start justify-between px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-900/80 animate-pulse"
                >
                    <div className="flex items-start gap-3 min-w-0 flex-1 mr-3">
                        {/* Avatar Skeleton */}
                        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0 mt-0.5" />

                        {/* Text Lines */}
                        <div className="flex flex-col min-w-0 flex-1">
                            {/* Display Name */}
                            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
                            {/* Username */}
                            <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-md mt-1.5" />
                            {/* Bio */}
                            <div className="h-3 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md mt-2" />
                            {/* Followers */}
                            <div className="h-2.5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md mt-2" />
                        </div>
                    </div>

                    {/* Button Skeleton */}
                    <div className="w-20 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                </div>
            ))}
        </div>
    );
};

export default SearchSkeleton;
