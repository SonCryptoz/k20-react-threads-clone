import { cn } from "cn";

/**
 * MediaGallery
 * Component chuẩn hóa hiển thị danh sách ảnh/media cho bài viết (Threads layout):
 * - 1 ảnh: Hiển thị 1 ảnh đơn nguyên vẹn
 * - 2 ảnh: Chia 2 cột tỷ lệ 50:50
 * - 3 ảnh: 1 ảnh lớn cột trái (50%) + 2 ảnh xếp dọc đều nhau cột phải (50:50)
 * - 4 ảnh: Grid 2x2 cân đối 4 góc (chia 2 cột flex đều)
 * - >4 ảnh: Grid 2x2 kèm huy hiệu "+N" ở góc thứ 4
 * - Hỗ trợ prop compact: Thu nhỏ chiều cao dành cho bài trích dẫn (Quoted Post) và các modal
 * - Hỗ trợ crossOrigin: Cần thiết cho html-to-image khi xuất ảnh bài viết
 */
const MediaGallery = ({
    media = [],
    compact = false,
    crossOrigin,
    className,
    onImageClick,
}) => {
    // Chuẩn hóa danh sách URL (hỗ trợ cả mảng string lẫn mảng object)
    const urls = (Array.isArray(media) ? media : [])
        .map((item) =>
            typeof item === "string" ? item : item?.url || item?.preview_url,
        )
        .filter(Boolean);

    if (urls.length === 0) return null;

    // 1. Trường hợp: 1 ảnh duy nhất
    if (urls.length === 1) {
        return (
            <div
                className={cn(
                    "w-full rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900",
                    compact ? "max-h-64 rounded-xl" : "max-h-125",
                    className,
                )}
            >
                <img
                    src={urls[0]}
                    alt="Post media 1"
                    crossOrigin={crossOrigin}
                    loading="lazy"
                    onClick={() => onImageClick?.(urls[0], 0)}
                    className={cn(
                        "w-full object-cover transition-opacity duration-200",
                        compact ? "max-h-64" : "max-h-125",
                        onImageClick && "cursor-pointer hover:opacity-95",
                    )}
                />
            </div>
        );
    }

    // 2. Trường hợp: 2 ảnh (chia 2 cột 50:50)
    if (urls.length === 2) {
        return (
            <div
                className={cn(
                    "grid grid-cols-2 gap-1.5 w-full rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900",
                    compact ? "h-48 sm:h-56 rounded-xl gap-1" : "h-64 sm:h-80 md:h-92",
                    className,
                )}
            >
                {urls.map((url, i) => (
                    <div
                        key={i}
                        className="relative w-full h-full min-h-0 min-w-0 overflow-hidden bg-neutral-200 dark:bg-neutral-800"
                    >
                        <img
                            src={url}
                            alt={`Post media ${i + 1}`}
                            crossOrigin={crossOrigin}
                            loading="lazy"
                            onClick={() => onImageClick?.(url, i)}
                            className={cn(
                                "w-full h-full object-cover transition-opacity duration-200",
                                onImageClick && "cursor-pointer hover:opacity-95",
                            )}
                        />
                    </div>
                ))}
            </div>
        );
    }

    // 3. Trường hợp: 3 ảnh (1 ảnh lớn bên trái, 2 ảnh xếp dọc đều 50:50 bên phải)
    if (urls.length === 3) {
        return (
            <div
                className={cn(
                    "grid grid-cols-2 gap-1.5 w-full rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900",
                    compact ? "h-52 sm:h-60 rounded-xl gap-1" : "h-64 sm:h-80 md:h-92",
                    className,
                )}
            >
                {/* Cột trái: 1 ảnh lớn full chiều cao */}
                <div className="relative w-full h-full min-h-0 min-w-0 overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                    <img
                        src={urls[0]}
                        alt="Post media 1"
                        crossOrigin={crossOrigin}
                        loading="lazy"
                        onClick={() => onImageClick?.(urls[0], 0)}
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-200",
                            onImageClick && "cursor-pointer hover:opacity-95",
                        )}
                    />
                </div>

                {/* Cột phải: 2 ảnh xếp dọc chia đều 50:50 bằng flex column */}
                <div className={cn("flex flex-col gap-1.5 w-full h-full min-h-0 min-w-0", compact && "gap-1")}>
                    {urls.slice(1, 3).map((url, i) => (
                        <div
                            key={i}
                            className="relative flex-1 min-h-0 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800"
                        >
                            <img
                                src={url}
                                alt={`Post media ${i + 2}`}
                                crossOrigin={crossOrigin}
                                loading="lazy"
                                onClick={() => onImageClick?.(url, i + 1)}
                                className={cn(
                                    "w-full h-full object-cover transition-opacity duration-200",
                                    onImageClick && "cursor-pointer hover:opacity-95",
                                )}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 4. Trường hợp: 4 ảnh trở lên (Grid 2x2 chia 2 cột flex đều 4 góc, có badge +N nếu nhiều hơn 4 ảnh)
    const displayUrls = urls.slice(0, 4);
    const remainingCount = urls.length - 4;

    return (
        <div
            className={cn(
                "grid grid-cols-2 gap-1.5 w-full rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900",
                compact ? "h-56 sm:h-64 rounded-xl gap-1" : "h-72 sm:h-88 md:h-96",
                className,
            )}
        >
            {/* Cột trái: Ảnh 1 (trên) & Ảnh 3 (dưới) */}
            <div className={cn("flex flex-col gap-1.5 w-full h-full min-h-0 min-w-0", compact && "gap-1")}>
                <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                    <img
                        src={displayUrls[0]}
                        alt="Post media 1"
                        crossOrigin={crossOrigin}
                        loading="lazy"
                        onClick={() => onImageClick?.(displayUrls[0], 0)}
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-200",
                            onImageClick && "cursor-pointer hover:opacity-95",
                        )}
                    />
                </div>
                <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                    <img
                        src={displayUrls[2]}
                        alt="Post media 3"
                        crossOrigin={crossOrigin}
                        loading="lazy"
                        onClick={() => onImageClick?.(displayUrls[2], 2)}
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-200",
                            onImageClick && "cursor-pointer hover:opacity-95",
                        )}
                    />
                </div>
            </div>

            {/* Cột phải: Ảnh 2 (trên) & Ảnh 4 (dưới kèm badge nếu còn) */}
            <div className={cn("flex flex-col gap-1.5 w-full h-full min-h-0 min-w-0", compact && "gap-1")}>
                <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                    <img
                        src={displayUrls[1]}
                        alt="Post media 2"
                        crossOrigin={crossOrigin}
                        loading="lazy"
                        onClick={() => onImageClick?.(displayUrls[1], 1)}
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-200",
                            onImageClick && "cursor-pointer hover:opacity-95",
                        )}
                    />
                </div>
                <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                    <img
                        src={displayUrls[3]}
                        alt="Post media 4"
                        crossOrigin={crossOrigin}
                        loading="lazy"
                        onClick={() => onImageClick?.(displayUrls[3], 3)}
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-200",
                            onImageClick && "cursor-pointer hover:opacity-95",
                        )}
                    />
                    {remainingCount > 0 && (
                        <div
                            onClick={() => onImageClick?.(displayUrls[3], 3)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-xl sm:text-2xl select-none cursor-pointer"
                        >
                            +{remainingCount}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaGallery;
