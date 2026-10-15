import { useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import useDocumentTitle from "@/hooks/useDocumentTitle";
import useWindowScrollSync from "@/hooks/useWindowScrollSync";
import usePostInteractions from "@/hooks/usePostInteractions";
import FeedHeader from "@/components/post/FeedHeader";
import PostCard from "@/components/post/PostCard";
import FeedSkeletonList from "@/components/post/PostSkeleton";
import ReplyModal from "@/components/modals/ReplyModal";
import QuoteModal from "@/components/modals/QuoteModal";
import EditPostModal from "@/components/modals/EditPostModal";
import CopyImageModal from "@/components/modals/CopyImageModal";
import EmbedModal from "@/components/modals/EmbedModal";
import { Button } from "@/components/ui/button";

import useHomeFeed from "./hooks/useHomeFeed";

const HomePage = () => {
    const { t } = useTranslation();
    useDocumentTitle(t("home.title"));

    // 1. Hook quản lý danh sách feed & phân trang (tự động xử lý cuộn lên đầu và nhận bài mới)
    const {
        cardRef,
        activeTab,
        posts,
        setPosts,
        hasMore,
        isLoading,
        isLoadingMore,
        error,
        handleTabChange,
        reloadFeed,
        lastElementRef,
        removePost,
        updatePost,
    } = useHomeFeed();

    // 2. Hook quản lý tương tác bài viết (Like, Repost, Comment, Quote, Edit, Share Image...)
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
    } = usePostInteractions({
        posts,
        setPosts,
        onDeleteSuccess: removePost,
        onEditSuccess: updatePost,
    });

    // 3. Hook đồng bộ cuộn 2 chiều giữa khung card và thanh cuộn ngoài trang
    const contentRef = useRef(null);
    const { spacerHeight, handleCardScroll } = useWindowScrollSync({
        cardRef,
        contentRef,
        deps: [posts.length, isLoading],
        resetTrigger: activeTab,
    });

    return (
        <div className="w-full h-full md:h-auto relative">
            {/* Khung dính cố định trên màn hình (kéo dài full tận đáy trên desktop như Threads thật) */}
            <div className="w-full h-full flex flex-col md:sticky md:top-3 md:h-[calc(100dvh-0.75rem)]">
                {/* 1. Header chứa 3 tab */}
                <FeedHeader activeTab={activeTab} onTabChange={handleTabChange} />

                {/* 2. Khung post card container: CỐ ĐỊNH TRÊN MÀN HÌNH, ẨN HOÀN TOÀN SCROLLBAR TRONG KHUNG, FULL TẬN ĐÁY */}
                <div className="w-full flex-1 min-h-0 pt-2.5 md:pt-3">
                    <div
                        ref={cardRef}
                        onScroll={handleCardScroll}
                        className="w-full h-full rounded-t-[24px] md:rounded-b-none border-[1.5px] md:border-b-0 border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#101010] overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        <div ref={contentRef} className="w-full">
                            {/* Trạng thái tải lần đầu khi chuyển tab */}
                            {isLoading && <FeedSkeletonList count={5} />}

                            {/* Trạng thái gặp lỗi */}
                            {!isLoading && error && (
                                <div className="p-8 text-center flex flex-col items-center justify-center">
                                    <p className="text-sm text-rose-500 mb-3">{error}</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={reloadFeed}
                                        className="rounded-xl gap-2 cursor-pointer"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        {t("post.reload")}
                                    </Button>
                                </div>
                            )}

                            {/* Trạng thái danh sách trống */}
                            {!isLoading && !error && posts.length === 0 && (
                                <div className="py-20 text-center text-sm text-neutral-400 dark:text-neutral-500">
                                    {t("post.empty")}
                                </div>
                            )}

                            {/* Danh sách các bài viết */}
                            {!isLoading &&
                                posts.map((post) => (
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

                            {/* Vùng Sentinel theo dõi cuộn chạm đáy để tải thêm (nằm bên trong khung) */}
                            {posts.length > 0 && (
                                <div
                                    ref={hasMore ? lastElementRef : null}
                                    className="w-full py-6 flex items-center justify-center"
                                >
                                    {isLoadingMore && (
                                        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                                    )}
                                    {!hasMore && !isLoading && (
                                        <span className="text-xs text-neutral-400 dark:text-neutral-600 select-none">
                                            {t("post.watched_all")}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal phản hồi bài viết (Reply/Comment) */}
            <ReplyModal
                isOpen={isReplyModalOpen}
                onClose={closeReplyModal}
                post={replyingPost}
                onSuccess={handleReplySuccess}
            />

            {/* Modal trích dẫn bài viết (Quote) */}
            <QuoteModal
                isOpen={isQuoteModalOpen}
                onClose={closeQuoteModal}
                post={quotingPost}
                onSuccess={handleQuoteSuccess}
            />

            {/* Modal chỉnh sửa bài viết (Edit) */}
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
                aria-hidden="true"
                style={{ height: `${spacerHeight}px` }}
                className="hidden md:block w-full pointer-events-none"
            />
        </div>
    );
};

export default HomePage;
