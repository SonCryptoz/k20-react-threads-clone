import { useCallback, useMemo } from "react";
import { formatTopicCount, cleanTopicName } from "../helpers/searchHelpers";

/**
 * useSearchTopicItem
 * Custom hook quản lý dữ liệu hiển thị và tương tác cho một dòng chủ đề (topic/hashtag) trong Search:
 * - Chuẩn hóa tên hashtag/topic loại bỏ ký tự '#' thừa (`cleanTopicName`)
 * - Định dạng số lượng bài viết của chủ đề (VD: 1.5k bài viết) (`formatTopicCount`)
 * - Xử lý sự kiện click chọn chủ đề để điền vào ô tìm kiếm
 */
export const useSearchTopicItem = ({ topic, onTopicClick } = {}) => {
    // Chuẩn hóa tên hashtag loại bỏ ký tự '#' thừa ở đầu
    const cleanName = useMemo(() => {
        return cleanTopicName(topic);
    }, [topic]);

    // Định dạng số lượng bài viết rút gọn (vd: 1.2k hoặc 2M)
    const formattedCount = useMemo(() => {
        if (!topic) return null;
        const raw =
            topic.posts_count ??
            topic.threads_count ??
            topic.count ??
            topic.posts_count_formatted ??
            null;
        return formatTopicCount(raw);
    }, [topic]);

    // Xử lý khi người dùng click vào dòng chủ đề để tìm kiếm theo chủ đề đó
    const handleClick = useCallback(() => {
        onTopicClick?.(topic);
    }, [onTopicClick, topic]);

    return {
        cleanName,
        formattedCount,
        handleClick,
    };
};

export default useSearchTopicItem;
