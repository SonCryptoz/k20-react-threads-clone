import {
    Heart,
    MessageCircle,
    Repeat,
    SendHorizonal,
    MessageSquareQuote,
    Link as LinkIcon,
    Image as ImageIcon,
    Code,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Thanh tương tác 4 nút dưới mỗi Post: Like, Comment, Repost, Share
const InteractionBar = ({
    post,
    onLike,
    onComment,
    onRepost,
    onQuote,
    onCopyLink,
    onCopyAsImage,
    onGetEmbedCode,
    onShare,
}) => {
    const { t } = useTranslation();

    const isLiked = Boolean(
        post?.is_liked_by_auth !== undefined
            ? post.is_liked_by_auth
            : post?.is_liked
    );
    const isReposted = Boolean(
        post?.is_reposted_by_auth !== undefined
            ? post.is_reposted_by_auth
            : post?.is_reposted
    );

    const likesCount = post?.likes_count || 0;
    const repliesCount = post?.replies_count || 0;
    const repostsCount = post?.reposts_and_quotes_count || post?.reposts_count || 0;

    return (
        <div className="flex items-center gap-1 -ml-2 text-neutral-800 dark:text-neutral-200 select-none">
            {/* 1. Nút Like */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onLike?.(post);
                }}
                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer group active:scale-90"
                title={isLiked ? t("post.unlike") : t("post.like")}
            >
                <Heart
                    size={19}
                    className={`transition-all duration-200 ${
                        isLiked
                            ? "fill-rose-500 text-rose-500 scale-105"
                            : "group-hover:text-rose-500 scale-100"
                    }`}
                />
                {likesCount > 0 && (
                    <span
                        className={`text-xs font-medium transition-colors ${
                            isLiked
                                ? "text-rose-500 font-semibold"
                                : "text-neutral-500 dark:text-neutral-400"
                        }`}
                    >
                        {likesCount}
                    </span>
                )}
            </button>

            {/* 2. Nút Comment / Reply */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onComment?.(post);
                }}
                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer group active:scale-90"
                title={t("post.reply")}
            >
                <MessageCircle
                    size={19}
                    className="group-hover:text-neutral-950 dark:group-hover:text-white transition-colors"
                />
                {repliesCount > 0 && (
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        {repliesCount}
                    </span>
                )}
            </button>

            {/* 3. Nút Repost / Quote (Dropdown Menu với Đăng lại và Trích dẫn) */}
            <DropdownMenu>
                <DropdownMenuTrigger
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    className="flex items-center gap-1.5 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer group active:scale-90 outline-none"
                    title={t("post.repost")}
                >
                    <Repeat
                        size={19}
                        className={`transition-colors duration-200 ${
                            isReposted
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "group-hover:text-emerald-500"
                        }`}
                    />
                    {repostsCount > 0 && (
                        <span
                            className={`text-xs font-medium ${
                                isReposted
                                    ? "text-emerald-500 font-semibold"
                                    : "text-neutral-500 dark:text-neutral-400"
                            }`}
                        >
                            {repostsCount}
                        </span>
                    )}
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="start"
                    side="bottom"
                    sideOffset={6}
                    className="w-48"
                    onClick={(e) => e.stopPropagation()}
                >
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            onRepost?.(post);
                        }}
                    >
                        <span>{isReposted ? t("post.unrepost") : t("post.repost")}</span>
                        <Repeat
                            size={19}
                            className={`ml-auto ${isReposted ? "text-emerald-500" : ""}`}
                        />
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            onQuote?.(post);
                        }}
                    >
                        <span>{t("post.quote")}</span>
                        <MessageSquareQuote size={19} className="ml-auto" />
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* 4. Nút Share (Dropdown Menu) */}
            <DropdownMenu>
                <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer group active:scale-90 outline-none"
                    title={t("post.share")}
                >
                    <SendHorizonal
                        size={18}
                        className="group-hover:text-neutral-950 dark:group-hover:text-white transition-colors"
                    />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="start"
                    side="bottom"
                    sideOffset={6}
                    className="w-48"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 1. Sao chép liên kết */}
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            onCopyLink?.(post);
                        }}
                    >
                        <span>{t("post.copy_link")}</span>
                        <LinkIcon
                            size={18}
                            className="ml-auto"
                        />
                    </DropdownMenuItem>

                    {/* 2. Sao chép dưới dạng hình ảnh */}
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            (onCopyAsImage || onShare)?.(post);
                        }}
                    >
                        <span>{t("post.copy_as_image")}</span>
                        <ImageIcon
                            size={18}
                            className="ml-auto"
                        />
                    </DropdownMenuItem>

                    {/* 3. Lấy mã nhúng */}
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            onGetEmbedCode?.(post);
                        }}
                    >
                        <span>{t("post.get_embed_code", "Lấy mã nhúng")}</span>
                        <Code
                            size={18}
                            className="ml-auto"
                        />
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default InteractionBar;
