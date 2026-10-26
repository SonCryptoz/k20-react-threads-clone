import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { RefreshCw, Loader2 } from "lucide-react";

import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import ProfileComposer from "@/components/profile/ProfileComposer";
import ProfileSuggestionsTab from "@/components/profile/ProfileSuggestionsTab";
import EditProfileModal from "@/components/modals/EditProfileModal";

import CreatePostModal from "@/components/modals/CreatePostModal";
import ReplyModal from "@/components/modals/ReplyModal";
import QuoteModal from "@/components/modals/QuoteModal";
import EditPostModal from "@/components/modals/EditPostModal";
import CopyImageModal from "@/components/modals/CopyImageModal";
import EmbedModal from "@/components/modals/EmbedModal";

import PostCard from "@/components/post/PostCard";
import FeedSkeletonList from "@/components/post/PostSkeleton";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";

import useProfilePage from "./hooks/useProfilePage";
import FollowModal from "@/components/modals/FollowModal";

const ProfileContent = () => {
    const { t } = useTranslation();

    const {
        // User & Thống kê
        currentUser,
        profileUser,
        isOwner,
        cleanUsername,
        followersCount,
        followingCount,
        isFollowing,
        isFollowLoading,
        isInfoLoading,
        isStatsLoading,
        handleToggleFollow,

        // Tab & Danh sách bài viết & Infinite Scroll
        activeTab,
        setActiveTab,
        posts,
        isLoadingPosts,
        isLoadingMore,
        hasMore,
        lastElementRef,
        postsError,
        handleReloadPosts,

        // Cuộn & Refs
        cardRef,
        contentRef,
        spacerRef,
        spacerHeight,
        handleCardScroll,

        // Modals state & handlers
        isEditProfileModalOpen,
        openEditProfileModal,
        closeEditProfileModal,
        isFollowModalOpen,
        setIsFollowModalOpen,
        followModalInitialTab,
        isCreateModalOpen,
        setIsCreateModalOpen,
        handleFollowChange,
        handleOpenFollowModal,
        handleCreatePostSuccess,

        // Đăng xuất (Logout)
        isLogoutAlertOpen,
        setIsLogoutAlertOpen,
        isLoggingOut,
        handleConfirmLogout,

        // Tương tác bài viết
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
        isEditModalOpen: isEditPostModalOpen,
        editPost,
        closeEditModal: closeEditPostModal,
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
    } = useProfilePage();

    return (
        <div className="w-full h-full md:h-auto relative">
            {/* Khung dính cố định kéo dài toàn màn hình tương tự trang Home */}
            <div className="w-full h-full flex flex-col md:sticky md:top-3 md:h-[calc(100dvh-0.75rem)]">
                {/* 1. Header đầu trang: Tiêu đề Trang cá nhân / Username & Nút Đăng xuất */}
                <header className="sticky top-0 z-20 w-full h-13 px-4 md:px-6 flex items-center justify-between backdrop-blur-md bg-white/85 dark:bg-[#101010]/85 border-b border-neutral-200/60 dark:border-neutral-800/80 transition-colors duration-200 select-none">
                    <div className="flex w-full items-center justify-between gap-3 min-w-0">
                        <span className="font-bold text-base text-neutral-900 dark:text-white tracking-tight truncate max-w-50 md:max-w-xs">
                            {profileUser?.username || profileUser?.name || cleanUsername || t("profile.title", "Trang cá nhân")}
                        </span>
                        {isOwner && (
                            <button
                                type="button"
                                onClick={() => setIsLogoutAlertOpen(true)}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer border border-neutral-200/80 dark:border-neutral-800 shrink-0"
                                title={t("auth.logout", "Đăng xuất")}
                            >
                                <span>{t("auth.logout", "Đăng xuất")}</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* 2. Khung post card container: CỐ ĐỊNH TRÊN MÀN HÌNH, CHIỀU CAO VÀ VỊ TRÍ ĐỒNG BỘ TUYỆT ĐỐI VỚI HOME */}
                <div className="w-full flex-1 min-h-0 pt-2.5 md:pt-3">
                    <div
                        ref={cardRef}
                        onScroll={handleCardScroll}
                        className="w-full h-full rounded-t-[24px] md:rounded-b-none border-[1.5px] md:border-b-0 border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#101010] overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        <div ref={contentRef} className="w-full">
                            {/* 1. Header Trang cá nhân */}
                            <ProfileHeader
                                user={profileUser}
                                followersCount={followersCount}
                                followingCount={followingCount}
                                isOwner={isOwner}
                                isFollowing={isFollowing}
                                isFollowLoading={isFollowLoading}
                                isInfoLoading={isInfoLoading}
                                isStatsLoading={isStatsLoading}
                                onToggleFollow={handleToggleFollow}
                                onOpenEditModal={openEditProfileModal}
                                onOpenFollowModal={handleOpenFollowModal}
                            />

                            {/* 2. Tabs: Cuộc trò chuyện & Bài đăng lại */}
                            <ProfileTabs
                                activeTab={activeTab}
                                onTabChange={(tab) => setActiveTab(tab)}
                                isOwner={isOwner}
                            />

                            {/* 3. Khung soạn thảo nhanh "Có gì mới?" (chỉ hiển thị trong tab Cuộc trò chuyện của chủ tài khoản) */}
                            {isOwner && activeTab === "threads" && (
                                <ProfileComposer
                                    currentUser={currentUser}
                                    onOpenCreateModal={() => setIsCreateModalOpen(true)}
                                />
                            )}

                            {/* 4. Nội dung theo tab đã chọn */}
                            <div className="w-full">
                                {/* Tab Gợi ý theo dõi dành cho chủ tài khoản (giữ nguyên DOM, không unmount khi chuyển tab) */}
                                {isOwner && (
                                    <div className={activeTab === "suggestions" ? "block" : "hidden"}>
                                        <ProfileSuggestionsTab onFollowChange={handleFollowChange} />
                                    </div>
                                )}

                                {/* Danh sách bài viết (threads, reposts) */}
                                <div className={activeTab === "suggestions" ? "hidden" : "block"}>
                                    {/* Trạng thái tải bài viết */}
                                    {isLoadingPosts && <FeedSkeletonList count={3} />}

                                    {/* Trạng thái lỗi */}
                                    {!isLoadingPosts && postsError && (
                                        <div className="p-8 text-center flex flex-col items-center justify-center">
                                            <p className="text-sm text-rose-500 mb-3">{postsError}</p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleReloadPosts}
                                                className="rounded-xl gap-2 cursor-pointer"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                {t("post.reload")}
                                            </Button>
                                        </div>
                                    )}

                                    {/* Trạng thái trống */}
                                    {!isLoadingPosts && !postsError && posts.length === 0 && (
                                        <div className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-500">
                                            {activeTab === "reposts"
                                                ? t("profile.no_reposts") || "Chưa có bài đăng lại nào"
                                                : t("profile.no_threads") || "Chưa có cuộc trò chuyện nào"}
                                        </div>
                                    )}

                                    {/* Danh sách bài viết */}
                                    {!isLoadingPosts &&
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

                                    {/* Vùng Sentinel theo dõi cuộn chạm đáy để tải thêm (Infinite Scroll) */}
                                    {posts.length > 0 && (
                                        <div
                                            ref={hasMore ? lastElementRef : null}
                                            className="w-full py-6 flex items-center justify-center"
                                        >
                                            {isLoadingMore && (
                                                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                                            )}
                                            {!hasMore && !isLoadingPosts && (
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
                </div>
            </div>

            {/* MODAL 1: Chỉnh sửa trang cá nhân (Tên, Bio, Quyền riêng tư, Avatar) */}
            <EditProfileModal
                isOpen={isEditProfileModalOpen}
                onClose={closeEditProfileModal}
            />

            {/* MODAL 2: Người theo dõi & Đang theo dõi (Followers & Following) */}
            <FollowModal
                isOpen={isFollowModalOpen}
                userId={profileUser?.id}
                initialTab={followModalInitialTab}
                onClose={() => setIsFollowModalOpen(false)}
                onFollowChange={handleFollowChange}
            />

            {/* MODAL 3: Tạo thread mới */}
            <CreatePostModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCreatePostSuccess}
            />

            {/* MODALS TƯƠNG TÁC BÀI VIẾT (Reply, Quote, Edit, Copy Image, Embed) */}
            <ReplyModal
                isOpen={isReplyModalOpen}
                onClose={closeReplyModal}
                post={replyingPost}
                onSuccess={handleReplySuccess}
            />

            <QuoteModal
                isOpen={isQuoteModalOpen}
                onClose={closeQuoteModal}
                post={quotingPost}
                onSuccess={handleQuoteSuccess}
            />

            <EditPostModal
                isOpen={isEditPostModalOpen}
                onClose={closeEditPostModal}
                post={editingPost}
                onSuccess={handleEditSuccess}
            />

            <CopyImageModal
                isOpen={isCopyImageModalOpen}
                onClose={closeCopyImageModal}
                post={copyImagePost}
            />

            <EmbedModal
                isOpen={isEmbedModalOpen}
                onClose={closeEmbedModal}
                post={embedPost}
            />

            {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
            <AlertDialog open={isLogoutAlertOpen} onOpenChange={setIsLogoutAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t("auth.logout_confirm_title", "Đăng xuất?")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("auth.logout_confirm_desc", "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản của mình không?")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoggingOut}>
                            {t("post.cancel", "Hủy")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleConfirmLogout}
                            disabled={isLoggingOut}
                        >
                            {isLoggingOut ? (
                                <Loader2 className="w-4 h-4 animate-spin text-inherit" />
                            ) : (
                                t("auth.logout", "Đăng xuất")
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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

const ProfilePage = () => {
    const { username } = useParams();
    const cleanKey = username ? username.replace(/^@/, "").trim().toLowerCase() : "me";

    return <ProfileContent key={cleanKey} />;
};

export default ProfilePage;
