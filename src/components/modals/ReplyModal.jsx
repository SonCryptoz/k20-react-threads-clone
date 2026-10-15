import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, User as UserIcon, X, Loader2 } from "lucide-react";
import { cn } from "cn";

import { Field, FieldContent, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

import useReplyModal from "./hooks/useReplyModal";
import ReplyParentPost from "./ReplyParentPost";
import QuotedPostPreview from "./QuotedPostPreview";
import ReplyToolbar from "./ReplyToolbar";
import ReplyFooter from "./ReplyFooter";
import MediaGallery from "@/components/common/MediaGallery";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

/**
 * ReplyModalContent
 * Giao diện chính của Modal phản hồi & trích dẫn (Quote):
 * Kết nối các sub-components (ReplyParentPost, QuotedPostPreview, ReplyToolbar, ReplyFooter)
 * cùng custom hook useReplyModal để xử lý logic.
 */
const ReplyModalContent = ({ post, onClose, onSuccess, mode = "reply" }) => {
    const { t } = useTranslation();

    const isQuoteMode = mode === "quote";
    const isEditMode = mode === "edit";
    const isCreateMode = mode === "create";

    const {
        currentUser,
        content,
        setContent,
        existingMediaUrls,
        quotedPost,
        mediaItems,
        handleFileChange,
        handleRemoveMedia,
        replyPermission,
        setReplyPermission,
        isPermissionMenuOpen,
        setIsPermissionMenuOpen,
        permissionOptions,
        topicName,
        setTopicName,
        isTopicInputOpen,
        setIsTopicInputOpen,
        isSubmitting,
        error,
        isPostButtonActive,
        handleSubmit,
        theme,
        language,
        textareaRef,
        fileInputRef,
        isEmojiPickerOpen,
        pickerPos,
        emojiBtnRef,
        emojiPickerRef,
        toggleEmojiPicker,
        handleSelectEmoji,
        handleInsertEmoji,
        isGifPickerOpen,
        closeGifPicker,
        toggleGifPicker,
        handleSelectGif,
        isDiscardAlertOpen,
        setIsDiscardAlertOpen,
        handleRequestClose,
        handleConfirmDiscard,
    } = useReplyModal({ post, onClose, onSuccess, mode });

    // Tự động giãn nở chiều cao textarea theo nội dung (Auto-resize) giúp không gian soạn thảo thoáng đãng, không bị thanh cuộn lồng hẹp
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            const minHeight = isCreateMode || isEditMode ? 140 : 72;
            textarea.style.height = `${Math.max(minHeight, textarea.scrollHeight)}px`;
        }
    }, [content, isCreateMode, isEditMode, textareaRef]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overscroll-contain transition-opacity duration-200 animate-in fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) {
                    handleRequestClose();
                }
            }}
        >
            <div
                className={cn(
                    "w-full max-h-[90vh] flex flex-col rounded-[22px] md:rounded-[24px] border-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#181818] shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden transition-[max-width] duration-150",
                    isCreateMode || isEditMode
                        ? "max-w-xl md:max-w-2xl lg:max-w-[700px]"
                        : "max-w-xl",
                )}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* 1. HEADER MODAL */}
                <header className="px-4 py-3 flex items-center justify-between border-b-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 shrink-0 select-none">
                    <button
                        type="button"
                        onClick={handleRequestClose}
                        disabled={isSubmitting}
                        className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
                    >
                        {t("post.cancel")}
                    </button>

                    <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                        {isEditMode
                            ? t("post.edit_title")
                            : isQuoteMode
                              ? t("post.quote_title")
                              : isCreateMode
                                ? t("profile.create_thread_title") || "Thread mới"
                                : t("post.reply_title")}
                    </h2>

                    <button
                        type="button"
                        className="w-7 h-7 rounded-full border border-neutral-300/80 dark:border-neutral-700/80 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                        title={t("post.option")}
                    >
                        <MoreHorizontal size={15} />
                    </button>
                </header>

                {/* 2. BODY NỘI DUNG CUỘN */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-3 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {/* Phần 1: Bài viết gốc (Parent Post - chỉ hiển thị ở chế độ Reply) */}
                    {!isQuoteMode && !isEditMode && !isCreateMode && <ReplyParentPost post={post} />}

                    {/* Phần 2: Khung nhập bài viết của user hiện tại */}
                    <div className="flex gap-3">
                        {/* Cột Avatar user hiện tại + Thread line nối xuống Thêm vào thread */}
                        <div className="flex flex-col items-center shrink-0">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center">
                                {currentUser?.avatar_url ? (
                                    <img
                                        src={currentUser.avatar_url}
                                        alt={currentUser?.username || "user"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="w-5 h-5 text-neutral-400" />
                                )}
                            </div>
                            {/* Đường Thread-Line nối nhỏ xuống Add to thread (chỉ hiển thị ở chế độ Reply) */}
                            {!isQuoteMode && !isEditMode && !isCreateMode && (
                                <div className="w-0.5 grow bg-neutral-200/70 dark:bg-neutral-800/70 my-1 min-h-4" />
                            )}
                        </div>

                        {/* Cột form nhập comment */}
                        <div className="flex-1 min-w-0">
                            {/* Username & Link thêm topic */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm text-neutral-950 dark:text-white">
                                    {currentUser?.username || currentUser?.name || "bạn"}
                                </span>

                                <span className="text-neutral-400 text-xs">›</span>

                                {!isTopicInputOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsTopicInputOpen(true)}
                                        className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                                    >
                                        {topicName ? `#${topicName}` : t("post.add_topic")}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="text"
                                            value={topicName}
                                            onChange={(e) => setTopicName(e.target.value)}
                                            placeholder={t("post.topic_input")}
                                            className="text-xs px-2 py-0.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent outline-none text-neutral-900 dark:text-white w-28"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsTopicInputOpen(false)}
                                            className="text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
                                        >
                                            ✓
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Textarea nhập nội dung (shadcn Field) */}
                            <Field className="w-full mt-1">
                                <FieldContent>
                                    <textarea
                                        ref={textareaRef}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder={
                                            isEditMode
                                                ? t("post.placeholder_edit")
                                                : isQuoteMode
                                                  ? t("post.placeholder_quote")
                                                  : isCreateMode
                                                    ? t("profile.whats_new") || "Có gì mới?"
                                                    : t("post.placeholder_reply", {
                                                          username:
                                                              post?.user?.username || post?.user?.name || "user",
                                                      })
                                        }
                                        rows={isCreateMode || isEditMode ? 5 : 3}
                                        disabled={isSubmitting}
                                        className={cn(
                                            "w-full bg-transparent resize-none outline-none text-sm md:text-[15px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 leading-relaxed overflow-y-hidden transition-[height] duration-75",
                                            isCreateMode || isEditMode ? "min-h-35 md:min-h-40" : "min-h-16",
                                        )}
                                    />
                                </FieldContent>
                                {error && <FieldError>{error}</FieldError>}
                            </Field>

                            {/* Previews của các file ảnh/video/GIF đã chọn */}
                            {mediaItems.length > 0 && (
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {mediaItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 group shrink-0 bg-neutral-100 dark:bg-neutral-800"
                                        >
                                            <img
                                                src={item.url}
                                                alt="preview"
                                                className={`w-full h-full object-cover transition-opacity duration-200 ${
                                                    item.isLoading ? "opacity-60" : "opacity-100"
                                                }`}
                                            />

                                            {/* Spinner overlay khi GIF đang tải trong background */}
                                            {item.isLoading && (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                                </div>
                                            )}

                                            {/* Nút hủy/xóa preview */}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMedia(item.id)}
                                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
                                                title={t("post.cancel")}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Previews của media đã đăng trước đó khi ở chế độ Chỉnh sửa (Edit) */}
                            {isEditMode && existingMediaUrls.length > 0 && (
                                <MediaGallery media={existingMediaUrls} compact={true} className="mt-2.5" />
                            )}

                            {/* Khung xem trước nội dung post được trích dẫn (chế độ Quote hoặc khi sửa bài có Quote) */}
                            {quotedPost && <QuotedPostPreview post={quotedPost} />}

                            {/* Toolbar 5 nút chức năng & Emoji popover */}
                            <ReplyToolbar
                                fileInputRef={fileInputRef}
                                handleFileChange={handleFileChange}
                                handleInsertEmoji={handleInsertEmoji}
                                emojiBtnRef={emojiBtnRef}
                                isEmojiPickerOpen={isEmojiPickerOpen}
                                toggleEmojiPicker={toggleEmojiPicker}
                                emojiPickerRef={emojiPickerRef}
                                pickerPos={pickerPos}
                                handleSelectEmoji={handleSelectEmoji}
                                theme={theme}
                                language={language}
                                isGifPickerOpen={isGifPickerOpen}
                                closeGifPicker={closeGifPicker}
                                toggleGifPicker={toggleGifPicker}
                                handleSelectGif={handleSelectGif}
                                isEditMode={isEditMode}
                                t={t}
                            />
                        </div>
                    </div>

                    {/* Hàng nhỏ: Thêm vào thread (Add to thread - chỉ hiển thị ở chế độ Reply) */}
                    {!isQuoteMode && !isEditMode && (
                        <div
                            className={`flex items-center gap-3 pl-2.5 pt-1 select-none transition-opacity duration-150 ${
                                isPostButtonActive ? "opacity-100" : "opacity-45"
                            }`}
                        >
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-neutral-300 dark:bg-neutral-700 shrink-0 flex items-center justify-center">
                                {currentUser?.avatar_url ? (
                                    <img
                                        src={currentUser.avatar_url}
                                        alt="user"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="w-2.5 h-2.5 text-neutral-400" />
                                )}
                            </div>
                            <button
                                type="button"
                                disabled={!isPostButtonActive}
                                onClick={() => {
                                    textareaRef.current?.focus();
                                }}
                                className={`text-xs transition-colors ${
                                    isPostButtonActive
                                        ? "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white font-medium cursor-pointer"
                                        : "text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                                }`}
                            >
                                {t("post.add_to_thread")}
                            </button>
                        </div>
                    )}
                </div>

                {/* 3. FOOTER MODAL (Quyền trả lời & Nút Đăng) */}
                <ReplyFooter
                    replyPermission={replyPermission}
                    setReplyPermission={setReplyPermission}
                    isPermissionMenuOpen={isPermissionMenuOpen}
                    setIsPermissionMenuOpen={setIsPermissionMenuOpen}
                    permissionOptions={permissionOptions}
                    handleSubmit={handleSubmit}
                    isPostButtonActive={isPostButtonActive}
                    isSubmitting={isSubmitting}
                    mode={mode}
                />
            </div>

            {/* 4. Alert Dialog cảnh báo Bỏ thread (Discard thread confirmation) */}
            <AlertDialog open={isDiscardAlertOpen} onOpenChange={setIsDiscardAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t("post.discard_thread_title")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="sr-only">
                            {t("post.discard_thread_title")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {t("post.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleConfirmDiscard}
                        >
                            {t("post.discard")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

/**
 * ReplyModal
 * Modal bọc ngoài: Quản lý khóa cuộn trang body và render ReplyModalContent
 */
const ReplyModal = ({ isOpen, onClose, post, onSuccess, mode = "reply" }) => {
    // Khóa cuộn trang ngoài (cả body và html) khi modal đang mở
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;
    if (mode !== "create" && !post) return null;

    return (
        <ReplyModalContent
            key={`${post?.id || "create"}-${mode}`}
            post={post}
            onClose={onClose}
            onSuccess={onSuccess}
            mode={mode}
        />
    );
};

export default ReplyModal;
