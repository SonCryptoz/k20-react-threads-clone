import { RefreshCw, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

import ActivityHeader from "@/components/activity/ActivityHeader";
import FollowerActivityItem from "@/components/activity/FollowerActivityItem";
import ActivitySkeleton from "@/components/activity/ActivitySkeleton";
import ActivityEmptyState from "@/components/activity/ActivityEmptyState";
import PostCard from "@/components/post/PostCard";
import ReplyModal from "@/components/modals/ReplyModal";
import QuoteModal from "@/components/modals/QuoteModal";
import EditPostModal from "@/components/modals/EditPostModal";
import CopyImageModal from "@/components/modals/CopyImageModal";
import EmbedModal from "@/components/modals/EmbedModal";

import useActivityPage from "./hooks/useActivityPage";

const ActivityPage = () => {
    const { t } = useTranslation();

    const {
        activeTab,
        handleTabChange,
        followers,
        reposts,
        isLoading,
        isLoadingMore,
        hasMore,
        lastElementRef,
        error,
        reload,
        followingMap,
        actionLoadingMap,
        handleToggleFollow,
        handleUserClick,
        cardRef,
        contentRef,
        spacerHeight,
        handleCardScroll,
        interactions,
    } = useActivityPage();

    const {
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
    } = interactions;

    return (
        <div className="w-full h-full md:h-auto relative">
            {/* Khung dính cố định container đồng bộ với HomePage & ProfilePage */}
            <div className="w-full h-full flex flex-col md:sticky md:top-3 md:h-[calc(100dvh-0.75rem)]">
                {/* 1. Header chứa 2 Tab: Followers & Reposts */}
                <ActivityHeader activeTab={activeTab} onTabChange={handleTabChange} />

                {/* 2. Khung post card container: CỐ ĐỊNH TRÊN MÀN HÌNH, FULL TẬN ĐÁY TRÊN DESKTOP */}
                <div className="w-full flex-1 min-h-0 pt-2.5 md:pt-3">
                    <div
                        ref={cardRef}
                        onScroll={handleCardScroll}
                        className="w-full h-full rounded-t-[24px] md:rounded-b-none border-[1.5px] md:border-b-0 border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#101010] overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        <div ref={contentRef} className="w-full">
                            {/* Trạng thái đang tải */}
                            {isLoading && <ActivitySkeleton count={6} activeTab={activeTab} />}

                            {/* Trạng thái gặp lỗi */}
                            {!isLoading && error && (
                                <div className="p-8 text-center flex flex-col items-center justify-center">
                                    <p className="text-sm text-rose-500 mb-3">
                                        {error === "load_error"
                                            ? t("activity.load_error", "Không thể tải hoạt động. Vui lòng thử lại sau.")
                                            : error}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={reload}
                                        className="rounded-xl gap-2 cursor-pointer"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        {t("activity.reload", "Tải lại")}
                                    </Button>
                                </div>
                            )}

                            {/* Trạng thái danh sách trống */}
                            {!isLoading && !error && (
                                <>
                                    {activeTab === "followers" && followers.length === 0 && (
                                        <ActivityEmptyState activeTab="followers" />
                                    )}

                                    {activeTab === "reposts" && reposts.length === 0 && (
                                        <ActivityEmptyState activeTab="reposts" />
                                    )}
                                </>
                            )}

                            {/* Danh sách Followers */}
                            {!isLoading && !error && activeTab === "followers" && followers.length > 0 && (
                                <div className="flex flex-col">
                                    {followers.map((user) => (
                                        <FollowerActivityItem
                                            key={user.id}
                                            user={user}
                                            isFollowing={Boolean(followingMap[user.id])}
                                            isLoading={Boolean(actionLoadingMap[user.id])}
                                            onToggleFollow={handleToggleFollow}
                                            onUserClick={handleUserClick}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Danh sách Reposts (Bài đăng lại) */}
                            {!isLoading && !error && activeTab === "reposts" && reposts.length > 0 && (
                                <div className="flex flex-col">
                                    {reposts.map((post) => (
                                        <PostCard
                                            key={post.id}
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
                                        />
                                    ))}

                                    {/* Vùng Sentinel theo dõi cuộn chạm đáy để tải thêm (Infinite Scroll) */}
                                    <div
                                        ref={hasMore ? lastElementRef : null}
                                        className="w-full py-6 flex items-center justify-center"
                                    >
                                        {isLoadingMore && (
                                            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                                        )}
                                        {!hasMore && (
                                            <span className="text-xs text-neutral-400 dark:text-neutral-600 select-none">
                                                {t("post.watched_all")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer bù chiều cao ngoài trang, tạo thanh cuộn trang chính xác 1:1 trên Desktop */}
            <div
                aria-hidden="true"
                style={{ height: `${spacerHeight}px` }}
                className="hidden md:block w-full pointer-events-none"
            />

            {/* Modal phản hồi bài viết */}
            <ReplyModal
                isOpen={isReplyModalOpen}
                onClose={closeReplyModal}
                post={replyingPost}
                onSuccess={handleReplySuccess}
            />

            {/* Modal trích dẫn bài viết */}
            <QuoteModal
                isOpen={isQuoteModalOpen}
                onClose={closeQuoteModal}
                post={quotingPost}
                onSuccess={handleQuoteSuccess}
            />

            {/* Modal chỉnh sửa bài viết */}
            <EditPostModal
                isOpen={isEditModalOpen}
                onClose={closeEditModal}
                post={editingPost}
                onSuccess={handleEditSuccess}
            />

            {/* Modal chia sẻ ảnh chụp bài viết */}
            <CopyImageModal
                isOpen={isCopyImageModalOpen}
                onClose={closeCopyImageModal}
                post={copyImagePost}
            />

            {/* Modal mã nhúng bài viết */}
            <EmbedModal
                isOpen={isEmbedModalOpen}
                onClose={closeEmbedModal}
                post={embedPost}
            />
        </div>
    );
};

export default ActivityPage;
