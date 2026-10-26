import { ArrowLeft, RefreshCw, User as UserIcon, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import PostCard from "@/components/post/PostCard";
import FeedSkeletonList from "@/components/post/PostSkeleton";
import ReplyModal from "@/components/modals/ReplyModal";
import QuoteModal from "@/components/modals/QuoteModal";
import EditPostModal from "@/components/modals/EditPostModal";
import CopyImageModal from "@/components/modals/CopyImageModal";
import EmbedModal from "@/components/modals/EmbedModal";
import { Button } from "@/components/ui/button";

import usePostDetail from "./hooks/usePostDetail";

const PostDetailPage = () => {
    const { t } = useTranslation();

    // Hook quản lý trang chi tiết post & comments
    const {
        post,
        replies,
        isLoadingPost,
        isLoadingReplies,
        isLoadingMoreReplies,
        hasMoreReplies,
        error,
        currentUser,
        fetchPostDetail,
        // Dùng chung toàn bộ tương tác bài viết từ usePostInteractions
        likePost,
        repostPost,
        followUser,
        replyingPost,
        isReplyModalOpen,
        openReplyModal,
        closeReplyModal,
        handleReplySuccess,
        quotingPost,
        isQuoteModalOpen,
        openQuoteModal,
        closeQuoteModal,
        handleQuoteSuccess,
        editingPost,
        isEditModalOpen,
        editPost,
        closeEditModal,
        handleEditSuccess,
        copyImagePost,
        isCopyImageModalOpen,
        openCopyImageModal,
        closeCopyImageModal,
        copyPostLink,
        embedPost,
        isEmbedModalOpen,
        openEmbedModal,
        closeEmbedModal,
        deletePost,
        hidePost,
        savePost,
        blockUser,
        handleBack,
        cardRef,
        contentRef,
        spacerRef,
        spacerHeight,
        handleCardScroll,
        lastElementRef,
    } = usePostDetail();

    return (
        <div className="w-full h-full md:h-auto relative">
            {/* Khung dính cố định container đồng bộ với HomePage */}
            <div className="w-full h-full flex flex-col md:sticky md:top-3 md:h-[calc(100dvh-0.75rem)]">
                {/* 1. Header đầu trang: Nút Quay lại & Tiêu đề Thread (đặt bên ngoài khung card giống FeedHeader ở Home) */}
                <header className="sticky top-0 z-20 w-full h-13 px-4 flex items-center gap-3 backdrop-blur-md bg-white/85 dark:bg-[#101010]/85 border-b border-neutral-200/60 dark:border-neutral-800/80 transition-colors duration-200 select-none">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="p-2 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                        title={t("post.back")}
                        aria-label={t("post.back")}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-bold text-base text-neutral-900 dark:text-white tracking-tight">
                        {t("post.thread_header", "Thread")}
                    </h1>
                </header>

                {/* 2. Khung post card container: CỐ ĐỊNH TRÊN MÀN HÌNH, CHIỀU CAO VÀ VỊ TRÍ ĐỒNG BỘ TUYỆT ĐỐI VỚI HOME */}
                <div className="w-full flex-1 min-h-0 pt-2.5 md:pt-3">
                    <div
                        ref={cardRef}
                        onScroll={handleCardScroll}
                        className="w-full h-full rounded-t-[24px] md:rounded-b-none border-[1.5px] md:border-b-0 border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#101010] overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        <div ref={contentRef} className="w-full">
                            {/* 1. Đang tải bài viết gốc */}
                            {isLoadingPost && <FeedSkeletonList count={1} />}

                            {/* 2. Lỗi không tìm thấy bài viết */}
                            {!isLoadingPost && error && (
                                <div className="p-8 text-center flex flex-col items-center justify-center">
                                    <p className="text-sm text-rose-500 mb-4">
                                        {t(error, { defaultValue: error })}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={fetchPostDetail}
                                        className="rounded-xl gap-2 cursor-pointer"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        {t("post.reload")}
                                    </Button>
                                </div>
                            )}

                            {/* 3. Hiển thị bài viết gốc */}
                            {!isLoadingPost && post && (
                                <>
                                    <PostCard
                                        post={post}
                                        onLike={likePost}
                                        onComment={openReplyModal}
                                        onRepost={repostPost}
                                        onQuote={openQuoteModal}
                                        onCopyLink={copyPostLink}
                                        onShare={openCopyImageModal}
                                        onCopyAsImage={openCopyImageModal}
                                        onGetEmbedCode={openEmbedModal}
                                        onDelete={deletePost}
                                        onEdit={editPost}
                                        onHide={hidePost}
                                        onSave={savePost}
                                        onBlock={blockUser}
                                        onFollow={followUser}
                                        isDetail={true}
                                    />

                                    {/* Thanh gợi ý trả lời nhanh (Quick reply trigger bar) */}
                                    <div
                                        onClick={() => openReplyModal(post)}
                                        className="w-full px-4 py-3 border-b-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between gap-3 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors cursor-pointer select-none"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-200/60 dark:border-neutral-700/60">
                                                {currentUser?.avatar_url ? (
                                                    <img
                                                        src={currentUser.avatar_url}
                                                        alt="User avatar"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <UserIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                                                )}
                                            </div>
                                            <span className="text-sm truncate">
                                                {t("post.placeholder_reply", {
                                                    username:
                                                        post.user?.username ||
                                                        post.user?.name ||
                                                        "user",
                                                })}
                                            </span>
                                        </div>
                                        <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 shrink-0">
                                            {t("post.reply")}
                                        </span>
                                    </div>

                                    {/* Tiêu đề phần bình luận */}
                                    <div className="px-4 py-2.5 bg-neutral-50/60 dark:bg-[#141414] border-b border-neutral-200/60 dark:border-neutral-800/60">
                                        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                            {t("post.replies_heading")} ({post?.replies_count !== undefined ? post.replies_count : replies.length})
                                        </h2>
                                    </div>

                                    {/* Danh sách các câu trả lời (Replies list) */}
                                    {isLoadingReplies && (
                                        <div className="py-8 flex justify-center items-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                                        </div>
                                    )}

                                    {!isLoadingReplies && replies.length === 0 && (
                                        <div className="py-14 text-center text-sm text-neutral-400 dark:text-neutral-500 select-none">
                                            {t("post.no_replies")}
                                        </div>
                                    )}

                                    {!isLoadingReplies &&
                                        replies.map((replyItem) => (
                                            <PostCard
                                                key={replyItem.id}
                                                post={replyItem}
                                                onLike={likePost}
                                                onComment={openReplyModal}
                                                onRepost={repostPost}
                                                onQuote={openQuoteModal}
                                                onCopyLink={copyPostLink}
                                                onShare={openCopyImageModal}
                                                onCopyAsImage={openCopyImageModal}
                                                onGetEmbedCode={openEmbedModal}
                                                onDelete={deletePost}
                                                onEdit={editPost}
                                                onHide={hidePost}
                                                onSave={savePost}
                                                onBlock={blockUser}
                                                onFollow={followUser}
                                                isDetail={false}
                                                avatarSize="w-8 h-8"
                                            />
                                        ))}

                                    {/* Vùng Sentinel theo dõi cuộn chạm đáy để tải thêm replies */}
                                    {replies.length > 0 && (
                                        <div
                                            ref={hasMoreReplies ? lastElementRef : null}
                                            className="w-full py-6 flex items-center justify-center"
                                        >
                                            {isLoadingMoreReplies && (
                                                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                                            )}
                                            {!hasMoreReplies && !isLoadingReplies && (
                                                <span className="text-xs text-neutral-400 dark:text-neutral-600 select-none">
                                                    {t("post.watched_all")}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal soạn câu trả lời (ReplyModal) */}
            <ReplyModal
                isOpen={isReplyModalOpen}
                onClose={closeReplyModal}
                post={replyingPost}
                onSuccess={handleReplySuccess}
            />

            {/* Modal trích dẫn bài viết (QuoteModal) */}
            <QuoteModal
                isOpen={isQuoteModalOpen}
                onClose={closeQuoteModal}
                post={quotingPost}
                onSuccess={handleQuoteSuccess}
            />

            {/* Modal chỉnh sửa bài viết (EditPostModal) */}
            <EditPostModal
                isOpen={isEditModalOpen}
                onClose={closeEditModal}
                post={editingPost}
                onSuccess={handleEditSuccess}
            />

            {/* Modal chụp ảnh bài viết (Copy as image) */}
            <CopyImageModal
                isOpen={isCopyImageModalOpen}
                onClose={closeCopyImageModal}
                post={copyImagePost}
            />

            {/* Modal lấy mã nhúng bài viết (Get embed code) */}
            <EmbedModal
                isOpen={isEmbedModalOpen}
                onClose={closeEmbedModal}
                post={embedPost}
            />

            {/* Spacer bù chiều cao ngoài trang, tạo thanh cuộn trang chính xác 1:1 trên Desktop */}
            <div
                ref={spacerRef}
                aria-hidden="true"
                style={{ height: `${spacerHeight}px` }}
                className="hidden md:block w-full pointer-events-none"
            />
        </div>
    );
};

export default PostDetailPage;