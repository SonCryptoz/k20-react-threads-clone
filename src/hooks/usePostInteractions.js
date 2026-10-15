import { useState, useRef, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import copy from "copy-to-clipboard";
import { toast } from "@/components/ui/toast";
import postService from "@/services/postService";
import userService from "@/services/userService";
import userCache from "@/utils/userCache";

/**
 * usePostInteractions
 * Custom hook quản lý các hành vi tương tác trên bài viết (Like, Repost, Comment, Quote, Share...)
 * Dùng chung toàn diện cho HomePage, PostDetailPage, ProfilePage, SearchPage...
 *
 * Tính năng:
 * 1. Hỗ trợ cả danh sách bài viết (`posts`, `setPosts`) và bài viết đơn lẻ (`post`, `setPost`).
 * 2. Kiểm tra đăng nhập (Auth Guard) -> tự động chuyển hướng đến /login nếu chưa đăng nhập.
 * 3. Optimistic Update (0ms latency): Cập nhật UI ngay lập tức trước khi gọi API.
 * 4. Chống spam click (Pending Lock) bằng ref.
 * 5. Tự động đồng bộ số liệu chuẩn từ server hoặc Rollback khi có lỗi mạng/API.
 * 6. Quản lý trạng thái mở/đóng ReplyModal và QuoteModal đồng bộ.
 */
export const usePostInteractions = ({
    posts = [],
    setPosts,
    post = null,
    setPost,
    onReplySuccess,
    onQuoteSuccess,
    onDeleteSuccess,
    onEditSuccess,
    onRepostSuccess,
    onFollowSuccess,
} = {}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { isAuthenticated } = useSelector((state) => state.auth);

    // Lưu danh sách postId đang gọi API like để chống spam click trùng lặp (pending lock)
    const likingPostsRef = useRef(new Set());
    // Lưu danh sách postId đang gọi API repost để chống spam click trùng lặp
    const repostingPostsRef = useRef(new Set());
    // Lưu danh sách authorId đang gọi API follow để chống spam click trùng lặp
    const followingUsersRef = useRef(new Set());

    // State quản lý ReplyModal
    const [replyingPost, setReplyingPost] = useState(null);
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

    // State quản lý QuoteModal
    const [quotingPost, setQuotingPost] = useState(null);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

    // State quản lý EditModal
    const [editingPost, setEditingPost] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // State quản lý CopyImageModal (Chụp ảnh bài viết)
    const [copyImagePost, setCopyImagePost] = useState(null);
    const [isCopyImageModalOpen, setIsCopyImageModalOpen] = useState(false);

    // State quản lý EmbedModal (Lấy mã nhúng bài viết)
    const [embedPost, setEmbedPost] = useState(null);
    const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);

    // Helper: Cập nhật state bài viết theo ID (hỗ trợ cả post đơn lẻ lẫn mảng posts)
    const updatePostState = useCallback(
        (postId, updater) => {
            // 1. Cập nhật bài viết đơn lẻ (ví dụ root post trong PostDetail)
            if (setPost) {
                setPost((prev) => {
                    if (!prev) return prev;
                    if (String(prev.id) === String(postId)) {
                        return updater(prev);
                    }
                    if (prev.original_post && String(prev.original_post.id) === String(postId)) {
                        const updatedOriginal = updater(prev.original_post);
                        return {
                            ...updater(prev),
                            original_post: updatedOriginal,
                        };
                    }
                    return prev;
                });
            }
            // 2. Cập nhật danh sách bài viết (ví dụ feed ở Home hoặc replies ở PostDetail)
            if (setPosts) {
                setPosts((prevPosts) =>
                    prevPosts.map((p) => {
                        if (String(p.id) === String(postId)) {
                            return updater(p);
                        }
                        if (p.original_post && String(p.original_post.id) === String(postId)) {
                            const updatedOriginal = updater(p.original_post);
                            return {
                                ...updater(p),
                                original_post: updatedOriginal,
                            };
                        }
                        if (p.original_post_id && String(p.original_post_id) === String(postId)) {
                            return updater(p);
                        }
                        return p;
                    }),
                );
            }
        },
        [setPost, setPosts],
    );

    // Helper: Lấy thông tin bài viết hiện tại từ state
    const getCurrentPost = useCallback(
        (target) => {
            const postId = typeof target === "object" ? target?.id : target;
            if (!postId) return null;
            if (post) {
                if (String(post.id) === String(postId)) return post;
                if (post.original_post && String(post.original_post.id) === String(postId)) {
                    return post.original_post;
                }
            }
            if (posts && Array.isArray(posts)) {
                const found = posts.find(
                    (p) =>
                        String(p.id) === String(postId) ||
                        (p.original_post && String(p.original_post.id) === String(postId)) ||
                        (p.original_post_id && String(p.original_post_id) === String(postId)),
                );
                if (found) {
                    if (found.original_post && String(found.original_post.id) === String(postId)) {
                        return found.original_post;
                    }
                    return found;
                }
            }
            return typeof target === "object" ? target : null;
        },
        [post, posts],
    );

    // Like / Bỏ like bài viết (Toggle Like)
    const likePost = useCallback(
        async (target) => {
            const postId = typeof target === "object" ? target?.id : target;
            if (!postId) return;

            // Kiểm tra đăng nhập: Chưa đăng nhập -> chuyển hướng đến trang /login
            if (!isAuthenticated) {
                navigate("/login", { state: { from: location } });
                return;
            }

            // Chống spam click nếu request bài này đang xử lý
            if (likingPostsRef.current.has(postId)) return;

            // Tìm thông tin bài viết hiện tại
            const currentPost = getCurrentPost(target);
            if (!currentPost) return;

            const isCurrentlyLiked = Boolean(
                currentPost.is_liked_by_auth !== undefined
                    ? currentPost.is_liked_by_auth
                    : currentPost.is_liked,
            );
            const nextLiked = !isCurrentlyLiked;
            const currentCount = currentPost.likes_count || 0;
            const nextCount = nextLiked
                ? currentCount + 1
                : Math.max(0, currentCount - 1);

            // Optimistic Update: Cập nhật state ngay lập tức (0ms delay)
            updatePostState(postId, (p) => ({
                ...p,
                is_liked: nextLiked,
                is_liked_by_auth: nextLiked,
                likes_count: nextCount,
            }));

            // Khóa bài viết trong lúc request đang xử lý
            likingPostsRef.current.add(postId);

            try {
                // API dùng chung method post('/api/posts/:id/like') để toggle like/unlike
                const response = await postService.likePost(postId);

                // Đồng bộ lại dữ liệu chuẩn từ server nếu backend trả về
                const resData = response?.data;
                const serverLikesCount =
                    resData?.likes_count ??
                    resData?.post?.likes_count ??
                    response?.likes_count;
                const serverIsLiked =
                    resData?.is_liked ??
                    resData?.is_liked_by_auth ??
                    resData?.post?.is_liked ??
                    response?.is_liked;

                if (
                    typeof serverLikesCount === "number" ||
                    typeof serverIsLiked === "boolean"
                ) {
                    updatePostState(postId, (p) => ({
                        ...p,
                        ...(typeof serverLikesCount === "number" && {
                            likes_count: serverLikesCount,
                        }),
                        ...(typeof serverIsLiked === "boolean" && {
                            is_liked: serverIsLiked,
                            is_liked_by_auth: serverIsLiked,
                        }),
                    }));
                }
            } catch {
                // Rollback lại trạng thái ban đầu nếu request thất bại (lỗi mạng, server)
                updatePostState(postId, (p) => ({
                    ...p,
                    is_liked: isCurrentlyLiked,
                    is_liked_by_auth: isCurrentlyLiked,
                    likes_count: currentCount,
                }));
            } finally {
                likingPostsRef.current.delete(postId);
            }
        },
        [isAuthenticated, navigate, location, getCurrentPost, updatePostState],
    );

    // Đăng lại / Hủy đăng lại bài viết (Toggle Repost)
    const repostPost = useCallback(
        async (target) => {
            const postId = typeof target === "object" ? target?.id : target;
            if (!postId) return;

            // Kiểm tra đăng nhập
            if (!isAuthenticated) {
                navigate("/login", { state: { from: location } });
                return;
            }

            // Chống spam click trùng lặp
            if (repostingPostsRef.current.has(postId)) return;

            const currentPost = getCurrentPost(target);
            if (!currentPost) return;

            const isCurrentlyReposted = Boolean(
                currentPost.is_reposted_by_auth !== undefined
                    ? currentPost.is_reposted_by_auth
                    : currentPost.is_reposted,
            );
            const nextReposted = !isCurrentlyReposted;
            const currentCount =
                currentPost.reposts_and_quotes_count ||
                currentPost.reposts_count ||
                0;
            const nextCount = nextReposted
                ? currentCount + 1
                : Math.max(0, currentCount - 1);

            // Optimistic Update: Cập nhật state ngay lập tức (0ms delay)
            updatePostState(postId, (p) => ({
                ...p,
                is_reposted: nextReposted,
                is_reposted_by_auth: nextReposted,
                reposts_count: nextCount,
                reposts_and_quotes_count: nextCount,
            }));

            // Gọi callback optimistically để UI (như tab Reposts) phản hồi ngay lập tức
            onRepostSuccess?.({ postId, isReposted: nextReposted, target });

            // Khóa bài viết trong lúc request đang xử lý
            repostingPostsRef.current.add(postId);

            try {
                // API dùng method POST /api/posts/:id/repost để toggle repost/unrepost
                const response = await postService.repost(postId);

                const resData = response?.data;
                const serverCount =
                    resData?.reposts_and_quotes_count ??
                    resData?.reposts_count ??
                    resData?.post?.reposts_count ??
                    response?.reposts_count;
                const serverIsReposted =
                    resData?.is_reposted ??
                    resData?.is_reposted_by_auth ??
                    resData?.post?.is_reposted ??
                    response?.is_reposted;

                if (
                    typeof serverCount === "number" ||
                    typeof serverIsReposted === "boolean"
                ) {
                    updatePostState(postId, (p) => ({
                        ...p,
                        ...(typeof serverCount === "number" && {
                            reposts_count: serverCount,
                            reposts_and_quotes_count: serverCount,
                        }),
                        ...(typeof serverIsReposted === "boolean" && {
                            is_reposted: serverIsReposted,
                            is_reposted_by_auth: serverIsReposted,
                        }),
                    }));
                }

                // Thông báo toast thành công
                if (nextReposted) {
                    toast.success(t("post.repost_success"));
                } else {
                    toast.info(t("post.unrepost_success"));
                }
            } catch (err) {
                toast.error(err?.response?.data?.message || t("post.repost_failed"));
                // Rollback lại trạng thái ban đầu nếu request thất bại
                updatePostState(postId, (p) => ({
                    ...p,
                    is_reposted: isCurrentlyReposted,
                    is_reposted_by_auth: isCurrentlyReposted,
                    reposts_count: currentCount,
                    reposts_and_quotes_count: currentCount,
                }));
                onRepostSuccess?.({
                    postId,
                    isReposted: isCurrentlyReposted,
                    target,
                    isError: true,
                });
            } finally {
                repostingPostsRef.current.delete(postId);
            }
        },
        [isAuthenticated, navigate, location, getCurrentPost, updatePostState, onRepostSuccess, t],
    );

    // Helper: Cập nhật thông tin tác giả trong một bài viết (cả p.user và p.original_post.user)
    const updateAuthorInPost = useCallback((p, authorIdStr, nextState) => {
        let changed = false;
        let newP = p;

        if (p.user && String(p.user.id) === authorIdStr) {
            newP = {
                ...newP,
                user: {
                    ...newP.user,
                    is_followed_by_auth: nextState,
                    is_following: nextState,
                },
            };
            changed = true;
        }

        if (
            p.original_post &&
            p.original_post.user &&
            String(p.original_post.user.id) === authorIdStr
        ) {
            newP = {
                ...newP,
                original_post: {
                    ...newP.original_post,
                    user: {
                        ...newP.original_post.user,
                        is_followed_by_auth: nextState,
                        is_following: nextState,
                    },
                },
            };
            changed = true;
        }

        return changed ? newP : p;
    }, []);

    // Theo dõi / Bỏ theo dõi tác giả bài viết (Toggle Follow)
    const followUser = useCallback(
        async (targetAuthor) => {
            const authorId =
                typeof targetAuthor === "object" ? targetAuthor?.id : targetAuthor;
            if (!authorId) return;

            // Kiểm tra đăng nhập: Chưa đăng nhập -> chuyển hướng đến trang /login
            if (!isAuthenticated) {
                navigate("/login", { state: { from: location } });
                return;
            }

            const authorKey = String(authorId);

            // Chống spam click nếu request tác giả này đang xử lý (Pending Lock)
            if (followingUsersRef.current.has(authorKey)) return;

            // Xác định trạng thái follow hiện tại
            let isCurrentlyFollowing = null;
            if (
                targetAuthor &&
                typeof targetAuthor === "object" &&
                (targetAuthor.is_followed_by_auth !== undefined ||
                    targetAuthor.is_following !== undefined)
            ) {
                isCurrentlyFollowing = Boolean(
                    targetAuthor.is_followed_by_auth ?? targetAuthor.is_following,
                );
            }

            if (isCurrentlyFollowing === null) {
                const cached =
                    userCache.getById(authorId) ||
                    (targetAuthor?.username &&
                        userCache.getByUsername(targetAuthor.username));
                if (
                    cached &&
                    (cached.is_followed_by_auth !== undefined ||
                        cached.is_following !== undefined)
                ) {
                    isCurrentlyFollowing = Boolean(
                        cached.is_followed_by_auth ?? cached.is_following,
                    );
                } else if (post && String(post.user?.id) === authorKey) {
                    isCurrentlyFollowing = Boolean(
                        post.user.is_followed_by_auth ?? post.user.is_following,
                    );
                } else if (posts && Array.isArray(posts)) {
                    const found = posts.find(
                        (p) =>
                            String(p.user?.id) === authorKey ||
                            String(p.original_post?.user?.id) === authorKey,
                    );
                    if (found) {
                        const u =
                            String(found.user?.id) === authorKey
                                ? found.user
                                : found.original_post?.user;
                        isCurrentlyFollowing = Boolean(
                            u?.is_followed_by_auth ?? u?.is_following,
                        );
                    }
                }
            }

            if (isCurrentlyFollowing === null) {
                isCurrentlyFollowing = false;
            }

            const nextFollowing = !isCurrentlyFollowing;

            // Optimistic Update: Cập nhật ngay lập tức UI trên feed / bài viết đơn lẻ (0ms delay)
            if (setPost) {
                setPost((prev) => {
                    if (!prev) return prev;
                    return updateAuthorInPost(prev, authorKey, nextFollowing);
                });
            }
            if (setPosts) {
                setPosts((prevPosts) =>
                    prevPosts.map((p) =>
                        updateAuthorInPost(p, authorKey, nextFollowing),
                    ),
                );
            }

            // Lưu vào userCache và phát sự kiện đồng bộ toàn cầu
            const userToCache =
                typeof targetAuthor === "object" ? targetAuthor : { id: authorId };
            userCache.saveUser({
                ...userToCache,
                id: authorId,
                is_followed_by_auth: nextFollowing,
                is_following: nextFollowing,
            });
            userCache.setFollowing(userToCache, nextFollowing, userToCache.username);

            // Callback thông báo cho hook/component cha nếu có đăng ký
            onFollowSuccess?.({
                authorId,
                author: userToCache,
                isFollowing: nextFollowing,
            });

            // Khóa tác giả trong lúc request đang xử lý
            followingUsersRef.current.add(authorKey);

            try {
                if (isCurrentlyFollowing) {
                    await userService.unfollowUser(authorId);
                } else {
                    await userService.followUser(authorId);
                }

                const rawUsername = userToCache.username || userToCache.name || "";
                const cleanName = rawUsername ? `@${String(rawUsername).replace(/^@/, "")}` : "";

                if (nextFollowing) {
                    toast.success(
                        t("profile.follow_success", {
                            username: cleanName,
                            defaultValue: `Đã theo dõi ${cleanName}`,
                        }),
                    );
                } else {
                    toast.info(
                        t("profile.unfollow_success", {
                            username: cleanName,
                            defaultValue: `Đã bỏ theo dõi ${cleanName}`,
                        }),
                    );
                }
            } catch (err) {
                const message = err?.response?.data?.message || err?.message || "";
                const isAlreadyFollowing = /already following/i.test(message);

                if (isAlreadyFollowing) {
                    userCache.setFollowing(userToCache, true, userToCache.username);
                    if (setPost) {
                        setPost((prev) => (prev ? updateAuthorInPost(prev, authorKey, true) : prev));
                    }
                    if (setPosts) {
                        setPosts((prevPosts) =>
                            prevPosts.map((p) => updateAuthorInPost(p, authorKey, true)),
                        );
                    }
                    onFollowSuccess?.({
                        authorId,
                        author: userToCache,
                        isFollowing: true,
                    });
                    toast.info(
                        t("profile.already_following", {
                            defaultValue: "Bạn đã theo dõi người dùng này rồi",
                        }),
                    );
                } else {
                    // Rollback lại trạng thái ban đầu nếu request thất bại
                    if (setPost) {
                        setPost((prev) => {
                            if (!prev) return prev;
                            return updateAuthorInPost(prev, authorKey, isCurrentlyFollowing);
                        });
                    }
                    if (setPosts) {
                        setPosts((prevPosts) =>
                            prevPosts.map((p) =>
                                updateAuthorInPost(p, authorKey, isCurrentlyFollowing),
                            ),
                        );
                    }
                    userCache.setFollowing(userToCache, isCurrentlyFollowing, userToCache.username);
                    onFollowSuccess?.({
                        authorId,
                        author: userToCache,
                        isFollowing: isCurrentlyFollowing,
                        isError: true,
                    });
                    toast.error(
                        t(
                            "profile.follow_failed",
                            "Không thể cập nhật trạng thái theo dõi. Vui lòng thử lại.",
                        ),
                    );
                }
            } finally {
                followingUsersRef.current.delete(authorKey);
            }
        },
        [
            isAuthenticated,
            navigate,
            location,
            post,
            posts,
            setPost,
            setPosts,
            updateAuthorInPost,
            onFollowSuccess,
            t,
        ],
    );

    // Lắng nghe sự kiện follow toàn cục để đồng bộ trạng thái bài viết
    useEffect(() => {
        const handleFollowChanged = (e) => {
            const { userId, username, isFollowing: nextFollow } = e.detail || {};
            if (!userId && !username) return;

            const updater = (p) => {
                if (!p) return p;
                let changed = false;
                let newP = p;
                const authorIdStr = p.user?.id ? String(p.user.id) : null;
                const authorUsernameLower = p.user?.username
                    ? String(p.user.username).replace(/^@/, "").toLowerCase()
                    : null;

                const matchesId = userId && authorIdStr && String(userId) === authorIdStr;
                const matchesName =
                    username &&
                    authorUsernameLower &&
                    String(username).toLowerCase() === authorUsernameLower;

                if (matchesId || matchesName) {
                    newP = {
                        ...newP,
                        user: {
                            ...newP.user,
                            is_followed_by_auth: nextFollow,
                            is_following: nextFollow,
                        },
                    };
                    changed = true;
                }

                if (p.original_post?.user) {
                    const origIdStr = p.original_post.user.id
                        ? String(p.original_post.user.id)
                        : null;
                    const origUsernameLower = p.original_post.user.username
                        ? String(p.original_post.user.username).replace(/^@/, "").toLowerCase()
                        : null;
                    const matchesOrigId = userId && origIdStr && String(userId) === origIdStr;
                    const matchesOrigName =
                        username &&
                        origUsernameLower &&
                        String(username).toLowerCase() === origUsernameLower;

                    if (matchesOrigId || matchesOrigName) {
                        newP = {
                            ...newP,
                            original_post: {
                                ...newP.original_post,
                                user: {
                                    ...newP.original_post.user,
                                    is_followed_by_auth: nextFollow,
                                    is_following: nextFollow,
                                },
                            },
                        };
                        changed = true;
                    }
                }
                return changed ? newP : p;
            };

            if (setPost) {
                setPost((prev) => (prev ? updater(prev) : prev));
            }
            if (setPosts) {
                setPosts((prevPosts) => prevPosts.map(updater));
            }
        };

        window.addEventListener("user:follow_changed", handleFollowChanged);
        return () => window.removeEventListener("user:follow_changed", handleFollowChanged);
    }, [setPost, setPosts]);

    // Mở ReplyModal cho một bài viết
    const openReplyModal = useCallback(
        (targetPost) => {
            if (!targetPost) return;

            // Kiểm tra đăng nhập
            if (!isAuthenticated) {
                navigate("/login", { state: { from: location } });
                return;
            }

            setReplyingPost(targetPost);
            setIsReplyModalOpen(true);
        },
        [isAuthenticated, navigate, location],
    );

    // Đóng ReplyModal
    const closeReplyModal = useCallback(() => {
        setIsReplyModalOpen(false);
        setReplyingPost(null);
    }, []);

    // Xử lý khi gửi Reply thành công (tự động tăng replies_count)
    const handleReplySuccess = useCallback(
        (newReply) => {
            if (replyingPost?.id) {
                updatePostState(replyingPost.id, (p) => ({
                    ...p,
                    replies_count: (p.replies_count || 0) + 1,
                }));
            }
            toast.success(t("post.reply_success"));
            onReplySuccess?.(newReply, replyingPost);
            closeReplyModal();
        },
        [replyingPost, updatePostState, onReplySuccess, closeReplyModal, t],
    );

    // Mở QuoteModal cho một bài viết
    const openQuoteModal = useCallback(
        (targetPost) => {
            if (!targetPost) return;

            // Kiểm tra đăng nhập
            if (!isAuthenticated) {
                navigate("/login", { state: { from: location } });
                return;
            }

            setQuotingPost(targetPost);
            setIsQuoteModalOpen(true);
        },
        [isAuthenticated, navigate, location],
    );

    // Đóng QuoteModal
    const closeQuoteModal = useCallback(() => {
        setIsQuoteModalOpen(false);
        setQuotingPost(null);
    }, []);

    // Xử lý khi gửi Quote thành công (giữ nguyên reposts_count của bài gốc, nạp đầy đủ media cho bài trích dẫn)
    const handleQuoteSuccess = useCallback(
        (newPost) => {
            if (!newPost?.id) {
                closeQuoteModal();
                return;
            }

            // Đảm bảo bài viết trích dẫn (original_post) có đầy đủ media_urls và dữ liệu từ quotingPost
            const enrichedPost = {
                ...newPost,
                is_quote: true,
                original_post_id: quotingPost?.id || newPost.original_post_id,
                original_post: {
                    ...(quotingPost || {}),
                    ...(newPost.original_post || {}),
                    media_urls:
                        (quotingPost?.media_urls?.length ? quotingPost.media_urls : null) ||
                        (quotingPost?.images?.length ? quotingPost.images : null) ||
                        newPost.original_post?.media_urls ||
                        newPost.original_post?.images ||
                        [],
                    images:
                        (quotingPost?.images?.length ? quotingPost.images : null) ||
                        (quotingPost?.media_urls?.length ? quotingPost.media_urls : null) ||
                        newPost.original_post?.images ||
                        newPost.original_post?.media_urls ||
                        [],
                    user: newPost.original_post?.user || quotingPost?.user,
                },
            };

            // Nếu ở HomePage feed (chỉ có setPosts mà không có setPost), chèn bài mới lên đầu feed
            if (setPosts && !setPost) {
                setPosts((prevPosts) => {
                    const exists = prevPosts.some((p) => p.id === enrichedPost.id);
                    if (exists) return prevPosts;
                    return [enrichedPost, ...prevPosts];
                });
            }

            // Phát sự kiện post:created để các component/feed tự động cuộn lên đầu nhận bài mới
            window.dispatchEvent(
                new CustomEvent("post:created", { detail: enrichedPost }),
            );

            toast.success(t("post.quote_success"));
            onQuoteSuccess?.(enrichedPost, quotingPost);
            closeQuoteModal();
        },
        [quotingPost, setPosts, setPost, onQuoteSuccess, closeQuoteModal, t],
    );

    // Mở EditModal cho một bài viết
    const openEditModal = useCallback(
        (targetPost) => {
            if (!targetPost) return;

            // Kiểm tra đăng nhập
            if (!isAuthenticated) {
                navigate("/login", { state: { from: location } });
                return;
            }

            setEditingPost(targetPost);
            setIsEditModalOpen(true);
        },
        [isAuthenticated, navigate, location],
    );

    // Đóng EditModal
    const closeEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setEditingPost(null);
    }, []);

    // Xử lý khi chỉnh sửa bài viết thành công
    const handleEditSuccess = useCallback(
        (updatedData) => {
            const updated = updatedData?.data || updatedData;
            const targetId = editingPost?.id || updated?.id;

            if (targetId) {
                updatePostState(targetId, (p) => ({
                    ...p,
                    ...updated,
                }));
            }

            toast.success(t("post.edit_success"));
            onEditSuccess?.(updated, editingPost);
            closeEditModal();
        },
        [editingPost, updatePostState, onEditSuccess, closeEditModal, t],
    );

    // Mở CopyImageModal
    const openCopyImageModal = useCallback((targetPost) => {
        if (!targetPost) return;
        setCopyImagePost(targetPost);
        setIsCopyImageModalOpen(true);
    }, []);

    // Đóng CopyImageModal
    const closeCopyImageModal = useCallback(() => {
        setIsCopyImageModalOpen(false);
        setCopyImagePost(null);
    }, []);

    // Sao chép liên kết URL bài viết (Copy Link)
    const copyPostLink = useCallback(
        (target) => {
            const targetPost =
                typeof target === "object" ? target : getCurrentPost(target);
            if (!targetPost?.id) return;
            const author = targetPost.user || {};
            const authorUsername = author.username || author.name || "user";
            const postUrl = `${window.location.origin}/${authorUsername}/post/${targetPost.id}`;
            copy(postUrl);
            toast.success(t("post.link_copied"));
        },
        [getCurrentPost, t],
    );

    // Mở EmbedModal (Lấy mã nhúng bài viết)
    const openEmbedModal = useCallback((targetPost) => {
        if (!targetPost) return;
        setEmbedPost(targetPost);
        setIsEmbedModalOpen(true);
    }, []);

    // Đóng EmbedModal
    const closeEmbedModal = useCallback(() => {
        setIsEmbedModalOpen(false);
        setEmbedPost(null);
    }, []);

    // Xử lý khi bài viết bị xóa (Delete Post)
    const handleDeletePost = useCallback(
        (target) => {
            const deletedPostId = typeof target === "object" ? target?.id : target;
            if (!deletedPostId) return;
            const delStr = String(deletedPostId);

            // 1. Lọc bỏ bài viết khỏi danh sách posts (cả bài gốc lẫn các bài đăng lại repost của nó)
            if (setPosts) {
                setPosts((prev) =>
                    prev.filter((p) => {
                        const pid = String(p.id);
                        const origId = String(p.original_post_id || p.original_post?.id || "");
                        return pid !== delStr && origId !== delStr;
                    }),
                );
            }

            // 2. Đánh dấu xóa trong userCache client để không bị nạp lại từ cache
            userCache.markPostDeleted(deletedPostId);

            // 3. Phát sự kiện toàn cục post:deleted để tất cả các tabs/pages đồng bộ xóa sạch cache
            window.dispatchEvent(
                new CustomEvent("post:deleted", { detail: deletedPostId }),
            );

            // 3. Cập nhật bài viết đơn lẻ (root post trong PostDetail)
            if (setPost) {
                setPost((prev) => {
                    if (!prev) return prev;
                    // Nếu chính bài viết gốc bị xóa -> điều hướng về trang chủ
                    if (String(prev.id) === String(deletedPostId)) {
                        navigate("/", { replace: true });
                        return null;
                    }
                    // Nếu là 1 comment/reply dưới bài viết bị xóa -> giảm replies_count của bài viết gốc
                    return {
                        ...prev,
                        replies_count: Math.max(0, (prev.replies_count || 1) - 1),
                    };
                });
            }

            // 4. Gọi callback thông báo xóa thành công (cho component cha)
            onDeleteSuccess?.(deletedPostId);
        },
        [setPosts, setPost, navigate, onDeleteSuccess],
    );

    // Xử lý khi bài viết bị ẩn (Hide Post / Not Interested)
    const handleHidePost = useCallback(
        (target) => {
            const hiddenPostId = typeof target === "object" ? target?.id : target;
            if (!hiddenPostId) return;

            if (setPosts) {
                setPosts((prev) =>
                    prev.filter((p) => String(p.id) !== String(hiddenPostId)),
                );
            }
        },
        [setPosts],
    );

    // Cập nhật trạng thái Lưu bài viết
    const handleSavePost = useCallback(
        (postId, isSaved) => {
            updatePostState(postId, (p) => ({
                ...p,
                is_saved: isSaved,
                is_saved_by_auth: isSaved,
                is_bookmarked: isSaved,
            }));
        },
        [updatePostState],
    );

    // Xử lý khi Chặn tác giả bài viết
    const handleBlockUser = useCallback(
        (target) => {
            const blockedUserId = typeof target === "object" ? target?.id : target;
            if (!blockedUserId) return;

            if (setPosts) {
                setPosts((prev) =>
                    prev.filter(
                        (p) =>
                            String(p.user?.id) !== String(blockedUserId) &&
                            String(p.user_id) !== String(blockedUserId),
                    ),
                );
            }
            if (setPost) {
                setPost((prev) => {
                    if (
                        prev &&
                        (String(prev.user?.id) === String(blockedUserId) ||
                            String(prev.user_id) === String(blockedUserId))
                    ) {
                        navigate("/", { replace: true });
                        return null;
                    }
                    return prev;
                });
            }
        },
        [setPosts, setPost, navigate],
    );

    return {
        likePost,
        repostPost,
        followUser,
        toggleFollowUser: followUser,
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
        openEditModal,
        editPost: openEditModal,
        closeEditModal,
        handleEditSuccess,
        copyImagePost,
        isCopyImageModalOpen,
        openCopyImageModal,
        closeCopyImageModal,
        copyPostLink,
        copyLink: copyPostLink,
        sharePost: openCopyImageModal,
        embedPost,
        isEmbedModalOpen,
        openEmbedModal,
        closeEmbedModal,
        deletePost: handleDeletePost,
        hidePost: handleHidePost,
        savePost: handleSavePost,
        blockUser: handleBlockUser,
    };
};

export default usePostInteractions;