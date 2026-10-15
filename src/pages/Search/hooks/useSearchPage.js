import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import useDocumentTitle from "@/hooks/useDocumentTitle";
import useDebounce from "@/hooks/useDebounce";
import useWindowScrollSync from "@/hooks/useWindowScrollSync";
import userService from "@/services/userService";
import userCache from "@/utils/userCache";
import { toast } from "@/components/ui/toast";
import {
    extractUserList,
    extractTopicList,
    cleanTopicName,
} from "@/components/search/helpers/searchHelpers";

/**
 * useSearchPage
 * Custom hook quản lý toàn bộ nghiệp vụ và trạng thái cho trang Tìm kiếm (/search):
 * - Quản lý từ khóa tìm kiếm (`query`) và đồng bộ 2 chiều với URL Search Params (`?q=...`)
 * - Trì hoãn truy vấn với cơ chế Debounce 600ms (`useDebounce`) chống spam gọi API
 * - Tự động tải danh sách Gợi ý theo dõi (Follow Suggestions) ở trạng thái mặc định (khi query < 2 ký tự)
 * - Tìm kiếm đa năng song song: Tài khoản người dùng (Users) và Chủ đề / Hashtags (Topics) khi query >= 2 ký tự
 * - Tương tác Theo dõi / Bỏ theo dõi (Follow/Unfollow) trực tiếp với Optimistic UI (0ms latency)
 * - Tự chữa lành xung đột (Conflict Self-Healing) khi gặp lỗi "Already following this user"
 * - Đồng bộ trạng thái theo dõi toàn cục thời gian thực qua `userCache` và sự kiện `user:follow_changed`
 * - Kiểm tra phiên đăng nhập (Auth Guard) khi tương tác theo dõi
 * - Xử lý các trạng thái: Đang tải Skeleton, Không tìm thấy kết quả (Empty State), Gặp lỗi mạng và Tải lại (Reload)
 * - Đồng bộ cuộn 2 chiều giữa khung card nội dung và thanh cuộn trình duyệt (`useWindowScrollSync`)
 */
export const useSearchPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const { user: currentUser, isAuthenticated } = useSelector((state) => state.auth);

    useDocumentTitle(t("search.title", "Tìm kiếm"));

    // ==========================================
    // State & Refs: Từ khóa, kết quả tìm kiếm, trạng thái tải & Khóa tác vụ
    // ==========================================
    // Lấy từ khóa ban đầu từ URL Search Param '?q=...'
    const urlQuery = searchParams.get("q") || "";
    // State lưu giá trị chuỗi nhập liệu tìm kiếm theo thời gian thực từ input
    const [query, setQuery] = useState(urlQuery);
    // Áp dụng kỹ thuật Debounce 600ms để trì hoãn việc gọi API cho đến khi người dùng ngừng gõ
    const debouncedQuery = useDebounce(query, 600);

    // State lưu danh sách người dùng được đề xuất theo dõi (hiển thị khi chưa tìm kiếm hoặc từ khóa < 2 ký tự)
    const [suggestions, setSuggestions] = useState([]);
    // Cờ loading hiển thị skeleton cho danh sách gợi ý theo dõi ban đầu
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true);

    // State lưu kết quả tìm kiếm gồm 2 mảng: danh sách tài khoản (users) và danh sách chủ đề (topics)
    const [searchResults, setSearchResults] = useState({ users: [], topics: [] });
    // Cờ loading khi đang gọi API tìm kiếm tổng hợp
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    // State lưu trữ lỗi phát sinh trong quá trình tải gợi ý hoặc tìm kiếm
    const [error, setError] = useState(null);
    // Khóa số nguyên tăng dần dùng để kích hoạt chạy lại useEffect tải lại dữ liệu khi người dùng bấm thử lại
    const [reloadKey, setReloadKey] = useState(0);

    // Hashmap lưu trạng thái theo dõi của currentUser với từng user ID: { [userId]: boolean }
    const [followingMap, setFollowingMap] = useState({});
    // Hashmap lưu trạng thái đang gọi API follow/unfollow của từng user ID riêng biệt: { [userId]: boolean }
    const [actionLoadingMap, setActionLoadingMap] = useState({});
    // Ref Set lưu trữ ID các user đang xử lý follow nhằm khóa chống spam click / double-click trong tích tắc
    const followingUsersLockRef = useRef(new Set());

    // Cờ xác định hệ thống đang trong quá trình chờ debounce hoặc đang gọi API tìm kiếm
    const isSearching =
        (query.trim().length >= 2 && query !== debouncedQuery) || isSearchLoading;
    // Đồng bộ cuộn 2 chiều giữa khung card cố định và thanh cuộn ngoài trang của trình duyệt
    const { cardRef, contentRef, spacerHeight, handleCardScroll } = useWindowScrollSync({
        isLoading: isSuggestionsLoading || isSearchLoading,
    });

    // Cờ xác định đang ở chế độ tìm kiếm (khi từ khóa sau debounce có từ 2 ký tự trở lên)
    const isSearchMode = debouncedQuery.trim().length >= 2;
    // Cờ kiểm tra xem có kết quả người dùng hoặc chủ đề nào hay không
    const hasResults = searchResults.users.length > 0 || searchResults.topics.length > 0;
    // Cờ xác định trạng thái rỗng (Empty State): đã tìm kiếm nhưng không có kết quả nào
    const isEmpty = isSearchMode && !isSearchLoading && !hasResults;

    // Đồng bộ `query` với URL searchParams
    useEffect(() => {
        const trimmed = query.trim();
        const currentQ = searchParams.get("q") || "";
        if (trimmed && trimmed !== currentQ) {
            setSearchParams({ q: trimmed }, { replace: true });
        } else if (!trimmed && currentQ) {
            setSearchParams({}, { replace: true });
        }
    }, [query, searchParams, setSearchParams]);

    // Lắng nghe sự kiện follow toàn cục và thay đổi phiên đăng nhập để đồng bộ tức thì
    useEffect(() => {
        const handleFollowChanged = (e) => {
            const { userId, isFollowing } = e.detail || {};
            if (userId) {
                setFollowingMap((prev) => ({ ...prev, [userId]: isFollowing }));
            }
        };

        const handleSessionChanged = () => {
            if (!isAuthenticated) {
                setFollowingMap({});
                return;
            }
            setFollowingMap(() => {
                const next = {};
                const allUsers = [...suggestions, ...searchResults.users];
                allUsers.forEach((u) => {
                    if (u?.id) {
                        next[u.id] = userCache.isFollowing(u.id, u.username);
                    }
                });
                return next;
            });
        };

        window.addEventListener("user:follow_changed", handleFollowChanged);
        window.addEventListener("user:session_changed", handleSessionChanged);
        return () => {
            window.removeEventListener("user:follow_changed", handleFollowChanged);
            window.removeEventListener("user:session_changed", handleSessionChanged);
        };
    }, [isAuthenticated, suggestions, searchResults.users]);

    // Tải danh sách người dùng được hệ thống đề xuất theo dõi
    const loadSuggestions = useCallback(async (isCancelledRef) => {
        // 1. Bật cờ loading gợi ý và xóa lỗi trước đó
        setIsSuggestionsLoading(true);
        setError(null);

        try {
            // 2. Gọi API lấy danh sách người dùng gợi ý
            const res = await userService.getSuggestions({ page: 1, per_page: 20 });
            if (isCancelledRef.current) return;

            // 3. Chuẩn hóa và làm giàu dữ liệu (enrich avatar từ userCache nếu thiếu)
            const rawUsers = extractUserList(res);
            const enriched = rawUsers.map((u) => {
                const cached = userCache.getByUsername(u.username) || userCache.getById(u.id);
                const item = {
                    ...u,
                    avatar_url: u.avatar_url || cached?.avatar_url || null,
                };
                userCache.saveUser(item);
                return item;
            });

            // 4. Cập nhật state danh sách gợi ý
            setSuggestions(enriched);

            // 5. Cập nhật hashmap theo dõi cho các user này (chỉ khi người dùng đã đăng nhập)
            const map = {};
            enriched.forEach((u) => {
                map[u.id] =
                    isAuthenticated &&
                    (userCache.isFollowing(u.id, u.username) ||
                    Boolean(u.is_following || u.is_followed_by_auth));
            });
            setFollowingMap((prev) => ({ ...prev, ...map }));
        } catch (err) {
            // 6. Xử lý lỗi tải dữ liệu
            if (isCancelledRef.current) return;
            setError(err?.message || "load_error");
        } finally {
            // 7. Giải phóng cờ loading gợi ý
            if (!isCancelledRef.current) {
                setIsSuggestionsLoading(false);
            }
        }
    }, [isAuthenticated]);

    // Tìm kiếm đồng thời tài khoản người dùng và chủ đề / hashtag theo từ khóa
    const performSearch = useCallback(async (cleanQuery, isCancelledRef) => {
        // 1. Bật cờ loading tìm kiếm và xóa lỗi cũ
        setIsSearchLoading(true);
        setError(null);

        try {
            // 2. Gọi song song cả 2 API: search tổng hợp và search topics
            const [searchSettled, topicsSettled] = await Promise.allSettled([
                userService.search(cleanQuery, { per_page_users: 15, per_page_topics: 15 }),
                userService.searchTopics(cleanQuery),
            ]);

            if (isCancelledRef.current) return;

            const searchRes = searchSettled.status === "fulfilled" ? searchSettled.value : null;
            const topicsRes = topicsSettled.status === "fulfilled" ? topicsSettled.value : null;

            // 3. Trích xuất và làm giàu (enrich) danh sách người dùng tìm được
            const rawUsers = extractUserList(searchRes);
            const enrichedUsers = rawUsers.map((u) => {
                const cached = userCache.getByUsername(u.username) || userCache.getById(u.id);
                const item = {
                    ...u,
                    avatar_url: u.avatar_url || cached?.avatar_url || null,
                };
                userCache.saveUser(item);
                return item;
            });

            // 4. Cập nhật hashmap theo dõi cho các tài khoản trong kết quả tìm kiếm
            const map = {};
            enrichedUsers.forEach((u) => {
                map[u.id] =
                    isAuthenticated &&
                    (userCache.isFollowing(u.id, u.username) ||
                    Boolean(u.is_following || u.is_followed_by_auth));
            });
            setFollowingMap((prev) => ({ ...prev, ...map }));

            // 5. Trích xuất và hợp nhất các chủ đề từ cả 2 nguồn response
            const topicItemsFromSearch = extractTopicList(searchRes?.data?.topics || searchRes?.topics);
            const topicItemsFromTopicsApi = extractTopicList(topicsRes);
            const mergedTopics = [...topicItemsFromSearch, ...topicItemsFromTopicsApi];

            // 6. Lọc trùng lặp (deduplicate) chủ đề theo tên viết thường
            const uniqueTopicsMap = new Map();
            mergedTopics.forEach((t) => {
                if (!t) return;
                const clean = cleanTopicName(t);
                const key = clean.toLowerCase();
                if (key && !uniqueTopicsMap.has(key)) {
                    uniqueTopicsMap.set(key, typeof t === "string" ? { name: clean } : t);
                }
            });

            // 7. Cập nhật state kết quả tìm kiếm hoàn chỉnh
            setSearchResults({
                users: enrichedUsers,
                topics: Array.from(uniqueTopicsMap.values()),
            });
        } catch (err) {
            // 8. Bắt lỗi tìm kiếm
            if (isCancelledRef.current) return;
            setError(err?.message || "load_error");
        } finally {
            // 9. Giải phóng cờ loading tìm kiếm
            if (!isCancelledRef.current) {
                setIsSearchLoading(false);
            }
        }
    }, [isAuthenticated]);

    // Kích hoạt nạp gợi ý (khi debouncedQuery < 2 ký tự)
    useEffect(() => {
        const trimmed = debouncedQuery.trim();
        if (trimmed.length >= 2) return;

        const isCancelledRef = { current: false };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadSuggestions(isCancelledRef);

        return () => {
            isCancelledRef.current = true;
        };
    }, [debouncedQuery, reloadKey, loadSuggestions]);

    // Kích hoạt tìm kiếm (khi debouncedQuery >= 2 ký tự)
    useEffect(() => {
        const trimmed = debouncedQuery.trim();
        if (trimmed.length < 2) return;

        const isCancelledRef = { current: false };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        performSearch(trimmed, isCancelledRef);

        return () => {
            isCancelledRef.current = true;
        };
    }, [debouncedQuery, reloadKey, performSearch]);

    // Toggle Theo dõi / Bỏ theo dõi với Optimistic UI (0ms latency) & Self-Healing
    const handleToggleFollow = useCallback(
        async (targetUser) => {
            // 1. Kiểm tra guard targetUser
            if (!targetUser?.id) return;

            // 2. Auth Guard: Chưa đăng nhập -> điều hướng tới /login
            if (!isAuthenticated) {
                navigate("/login", { state: { from: location } });
                return;
            }

            const targetId = targetUser.id;
            const targetKey = String(targetId);

            // 3. Khóa chống double-click / spam bấm nút liên tục trong tích tắc
            if (followingUsersLockRef.current.has(targetKey)) return;

            // 4. Xác định trạng thái follow hiện tại và trạng thái đảo ngược kế tiếp
            const isCurrentlyFollowing = Boolean(
                followingMap[targetId] ?? userCache.isFollowing(targetId, targetUser.username),
            );
            const nextState = !isCurrentlyFollowing;

            // 5. Optimistic Update (0ms latency): Cập nhật ngay lập tức UI và userCache
            setFollowingMap((prev) => ({ ...prev, [targetId]: nextState }));
            userCache.setFollowing(targetUser, nextState);
            setActionLoadingMap((prev) => ({ ...prev, [targetId]: true }));
            followingUsersLockRef.current.add(targetKey);

            try {
                // 6. Gọi API unfollowUser hoặc followUser tương ứng
                if (isCurrentlyFollowing) {
                    await userService.unfollowUser(targetId);
                    toast.info(
                        t("profile.unfollow_success", {
                            username: targetUser.username || "user",
                            defaultValue: `Đã bỏ theo dõi @${targetUser.username || "user"}`,
                        }),
                    );
                } else {
                    await userService.followUser(targetId);
                    toast.success(
                        t("profile.follow_success", {
                            username: targetUser.username || "user",
                            defaultValue: `Đã theo dõi @${targetUser.username || "user"}`,
                        }),
                    );
                }
            } catch (err) {
                // 7. Xử lý lỗi & Tự chữa lành (Self-Healing)
                const message = err?.response?.data?.message || err?.message || "";
                const isAlreadyFollowing = /already following/i.test(message);

                if (isAlreadyFollowing) {
                    // Nếu backend báo đã follow trước đó, tự động khôi phục và duy trì trạng thái đã theo dõi
                    userCache.setFollowing(targetUser, true);
                    setFollowingMap((prev) => ({ ...prev, [targetId]: true }));
                    toast.info(
                        t("profile.already_following", {
                            defaultValue: "Bạn đã theo dõi người dùng này rồi",
                        }),
                    );
                } else {
                    // Rollback về trạng thái cũ nếu gặp lỗi mạng hoặc lỗi server khác
                    setFollowingMap((prev) => ({ ...prev, [targetId]: isCurrentlyFollowing }));
                    userCache.setFollowing(targetUser, isCurrentlyFollowing);
                    toast.error(
                        t("profile.follow_failed", {
                            defaultValue: "Không thể cập nhật trạng thái theo dõi. Vui lòng thử lại.",
                        }),
                    );
                }
            } finally {
                // 8. Mở khóa chống spam và giải phóng cờ loading hành động
                followingUsersLockRef.current.delete(targetKey);
                setActionLoadingMap((prev) => ({ ...prev, [targetId]: false }));
            }
        },
        [isAuthenticated, navigate, location, followingMap, t],
    );

    // Điều hướng sang trang cá nhân
    const handleUserClick = useCallback(
        (targetUser) => {
            if (!targetUser) return;
            const rawUsername = targetUser.username || targetUser.name || targetUser.id;
            const clean = String(rawUsername).replace(/^@/, "");
            navigate(`/${encodeURIComponent(clean)}`);
        },
        [navigate],
    );

    // Click chọn chủ đề / hashtag -> cập nhật input
    const handleTopicClick = useCallback((topic) => {
        const clean = cleanTopicName(topic);
        setQuery(`#${clean}`);
    }, []);

    // Xóa nhanh từ khóa
    const handleClear = useCallback(() => {
        setQuery("");
        setSearchResults({ users: [], topics: [] });
    }, []);

    // Reload khi gặp lỗi
    const reload = useCallback(() => {
        setReloadKey((k) => k + 1);
    }, []);

    return {
        query,
        setQuery,
        handleClear,
        isSearching,
        isSearchMode,
        debouncedQuery,
        suggestions,
        isSuggestionsLoading,
        searchResults,
        isSearchLoading,
        isEmpty,
        error,
        reload,
        followingMap,
        actionLoadingMap,
        currentUserId: currentUser?.id,
        handleToggleFollow,
        handleUserClick,
        handleTopicClick,
        cardRef,
        contentRef,
        spacerHeight,
        handleCardScroll,
    };
};

export default useSearchPage;
