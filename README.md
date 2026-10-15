# K20 React Threads Clone - F8 React Practice

> Dự án mô phỏng mạng xã hội **Threads (Meta)** phiên bản Web với trải nghiệm tương tác thời gian thực, giao diện chuẩn Pixel-Perfect, tối ưu hóa hiệu năng, xử lý đồng bộ đa màn hình và giải quyết các hạn chế của hệ thống backend.

- **Live Demo:** [https://k20-react-threads-clone.vercel.app](https://k20-react-threads-clone.vercel.app)

---

## 1. Mục tiêu dự án (Objectives)

- Xây dựng ứng dụng Threads Web hoàn chỉnh trên nền tảng **React 19** và **Tailwind CSS v4**.
- Áp dụng kiến trúc phân tầng **Presentation / Container Pattern** (tách biệt View và Custom Hooks).
- Làm chủ quản lý trạng thái nâng cao với **Redux Toolkit**, **Client-side Persistent Cache** và **Reactive Event-Driven Architecture**.
- Giải quyết triệt để các bài toán thực tế: Tương tác tức thì **0ms Optimistic UI**, cuộn vô tận (**Infinite Scroll**), đồng bộ Desktop Card 2 chiều, tự chữa lành lỗi (**Self-Healing**) và khắc phục các giới hạn của backend F8.
- Hỗ trợ đa ngôn ngữ (**i18n** Tiếng Việt / Tiếng Anh) và chế độ **Light / Dark Mode**.

---

## 2. Công nghệ sử dụng (Tech Stack)

- **Cốt lõi:** React 19, JavaScript (ES6+), JSX, Vite 8, ESLint 10 (100% Pass).
- **Styling & UI:** Tailwind CSS v4, Lucide React Icons, Geist Variable Font, Base UI.
- **Quản lý trạng thái:** Redux Toolkit (Auth State), LocalStorage Persistent Cache (`userCache`), Custom Event Bus (`window.dispatchEvent`).
- **Định tuyến & Bảo vệ:** React Router v7 (Nested Routes, Layout Wrappers, Private Route Guard).
- **Form & Validation:** React Hook Form, Zod Resolver.
- **Xử lý mạng:** Axios (Interceptors, Token Refresh Queue, Form Method Spoofing).
- **Quốc tế hóa & Tiện ích:** i18next, react-i18next, GIPHY API, `@emoji-mart/react`, `html-to-image`, `copy-to-clipboard`.

---

## 3. Tính năng chính (Features)

- **Bảng tin trang chủ (Home Feed):** 3 tab (_For you_, _Following_, _Ghost posts_), phân trang cuộn vô tận, tự động chèn bài mới đăng lên đầu feed.
- **Tìm kiếm thông minh (Search):** Trạng thái mặc định gợi ý theo dõi (_Follow Suggestions_), tìm kiếm song song Users & Topics với **Debounce 600ms**, đồng bộ URL `?q=...`.
- **Hoạt động (Activity):** Tab _Follows_ đối soát trạng thái 2 chiều (Theo dõi lại / Đang theo dõi); Tab _Reposts_ bài đăng lại có tương tác và cuộn vô tận.
- **Trang cá nhân (Profile):** Nhận diện quyền sở hữu (`isOwner`), chỉnh sửa hồ sơ & avatar, xem danh sách Followers/Following, 3 tab nội dung (_Threads_, _Reposts_, _Suggestions_).
- **Chi tiết bài viết (Post Detail):** Xem bài gốc và chuỗi replies phân cấp dạng cây, tự động sắp xếp mới nhất lên đầu.
- **Tương tác bài viết toàn diện:** Thích (Like), Đăng lại (Repost), Trích dẫn (Quote), Xuất ảnh PNG bài viết (`html-to-image`), Lấy mã nhúng iframe (`/embed`), Menu quản lý bài viết (Sửa, Xóa, Báo cáo vi phạm).
- **Hệ thống 10 Modals:** Reply, Quote, EditPost, EditProfile, Follow, CopyImage, Embed, BlockUser, DeletePost, Report.
- **Xác thực an toàn:** Đăng ký, Đăng nhập, Quên/Đặt lại mật khẩu, Xác minh email qua token URL.
- **Trải nghiệm giao diện (UX/UI):** Khung card cố định desktop đồng bộ 1:1, Skeleton Shimmer, Toast Notification, Khóa cuộn trang nền an toàn (`useLockBodyScroll`), Song ngữ (vi/en), Light/Dark theme.

---

## 4. Những giải pháp kỹ thuật nổi bật (Technical Highlights)

### 4.1. Khắc phục hạn chế Backend F8 (Backend Workarounds)

- **Trang Hoạt động:** Khắc phục lỗi 404 bằng cách kết hợp API `getFollowers` đối soát với `getFollowings` và nạp danh sách `getUserReposts` làm giàu dữ liệu gốc.
- **Bảo toàn ảnh đại diện (Avatar Persistence):** Ngăn chặn backend trả về `avatar_url: null` bằng cơ chế cache `localStorage` + phục hồi ngầm qua API search, đảm bảo F5 không mất avatar.
- **Dọn dẹp bài Repost mồ côi:** Phát hiện bài gốc bị xóa (404), tự động đưa vào danh sách đen `userCache.markPostDeleted` và ngăn render ghost cards.
- **Hỗ trợ PHP/Laravel Method Spoofing & GIPHY:** Tự động chuyển đổi `POST` kèm `_method: "PUT"/"DELETE"`; tải ngầm ảnh GIF thành `Blob -> File` để upload `multipart/form-data`.

### 4.2. Quản lý Cache & Đồng bộ thời gian thực (State & Cache Architecture)

- **Nguồn chân lý tập trung (Single Source of Truth):** Duy trì `followingIds` và `deletedPostIds` trong `userCache` lưu bền vững tại `localStorage`.
- **Phân tách phiên người dùng độc lập (User-Scoped Isolation):** Tự động cô lập danh sách followings theo ID từng tài khoản (`threads_followings_user_${userId}`), loại bỏ hoàn toàn hiện tượng rò rỉ trạng thái theo dõi khi đăng nhập tài khoản khác hoặc chưa đăng nhập.
- **Reactive Event Bus (0ms):** Phát sự kiện toàn cục (`user:follow_changed`, `user:session_changed`, `post:deleted`) giúp toàn bộ các trang và modals cập nhật đồng loạt ngay lập tức.
- **Tự chữa lành xung đột (Conflict Self-Healing):** Tự động nhận diện lỗi `Already following this user` để duy trì trạng thái "Đang theo dõi" mượt mà, không báo lỗi đỏ.

### 4.3. Tối ưu giao diện & Hiệu năng nâng cao (Advanced UX)

- **Đồng bộ cuộn Desktop Card (`useWindowScrollSync`):** Đo đạc chiều cao nội dung qua `ResizeObserver`, tạo `spacer` tàng hình và đồng bộ cuộn 2 chiều 60/120Hz mượt mà qua `requestAnimationFrame`.
- **Khóa cuộn trang nền an toàn (`useLockBodyScroll`):** Chặn wheel chaining, overscroll và touchmove khi mở Modal mà không dùng `overflow: hidden`, bảo toàn tuyệt đối thuộc tính `position: sticky`.
- **Đồng bộ kích thước Header & Card:** Đồng nhất chiều cao `h-13` (52px), viền dưới và khoảng cách `pt-2.5 md:pt-3` trên toàn bộ các trang (Home, Search, Activity, Profile, PostDetail).

---

## 5. Những gì đã học và đúc kết được (Key Learnings)

1. **Kiến trúc Presentation / Container:** Tách biệt triệt để giao diện View và custom hooks nghiệp vụ.
2. **Kỹ thuật Optimistic UI & Self-Healing:** Xây dựng trải nghiệm phản hồi tức thì 0ms và cơ chế phục hồi xung đột trạng thái client - server.
3. **Multi-tier Cache Architecture:** Kết hợp linh hoạt giữa Redux Toolkit, Web Storage, Memory Cache và Event Bus.
4. **Kỹ thuật DOM & CSS chuyên sâu:** Tận dụng `ResizeObserver`, `IntersectionObserver`, RAF và CSS Sticky Layout trên Tailwind CSS v4.
5. **Tư duy kỹ sư giải quyết vấn đề:** Khả năng bắt bệnh API, chủ động xây dựng giải pháp xử lý triệt để phía Frontend khi backend bị hạn chế.

---

## 6. Cấu trúc thư mục (Folder Structure)

```text
src/
├── assets/          # Hình ảnh, font chữ Geist, tài nguyên tĩnh
├── components/      # UI components chia theo miền nghiệp vụ (activity, post, profile, search, modals, ui)
├── constants/       # Hằng số cấu hình hệ thống (API endpoints, storage token keys)
├── contexts/        # ThemeContext (Light / Dark mode)
├── features/        # Redux Toolkit Slices (authSlice)
├── hooks/           # Core Global Hooks (usePostInteractions, useWindowScrollSync, useInfiniteScroll...)
├── layouts/         # Layout khung chính: DefaultLayout, AuthLayout, EmbedLayout
├── lib/             # Thư viện bổ trợ & cấu hình Tailwind utilities (cn helper)
├── locales/         # Bộ từ điển song ngữ: vi.json, en.json
├── pages/           # 8 Màn hình chính (Home, Search, Activity, Profile, PostDetail, Auth, Embed, NotFound)
├── routes/          # Hệ thống định tuyến: AppRoutes & PrivateRoute (Auth Guard)
├── schemas/         # Zod validation schemas
├── services/        # Service API Layer (authService, postService, userService, giphyService)
├── stores/          # Cấu hình Redux Store tập trung
└── utils/           # Tiện ích nền: http.js (Axios Interceptors), userCache.js, tokenStorage...
```

---

## 7. Hướng dẫn cài đặt & Khởi chạy (Installation & Setup)

### Yêu cầu môi trường:

- Node.js 18+ (khuyên dùng Node 20 LTS trở lên).
- Trình quản lý gói: `npm`, `yarn` hoặc `pnpm`.

### Các bước cài đặt:

1. **Clone mã nguồn:**
    ```bash
    git clone https://github.com/SonCryptoz/k20-react-threads-clone.git
    cd k20-react-threads-clone
    ```
2. **Cài đặt dependencies:**
    ```bash
    npm install
    ```
3. **Cấu hình môi trường:**
   Tạo file `.env`
    ```env
    VITE_API_BASE_URL=https://threads.f8team.dev
    VITE_GIPHY_API_KEY=your_giphy_api_key_here
    ```
4. **Khởi chạy Development:**
    ```bash
    npm run dev
    ```
5. **Kiểm tra Linter:**
    ```bash
    npm run lint
    ```
6. **Đóng gói Production:**
    ```bash
    npm run build
    ```
