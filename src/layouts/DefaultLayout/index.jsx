import { Outlet } from "react-router";
import { useSelector } from "react-redux";
import Sidebar from "./Sidebar";
import LoginPanel from "@/components/post/LoginPanel";

const DefaultLayout = () => {
    const { isAuthenticated } = useSelector((state) => state.auth);

    return (
        <div className="h-dvh md:min-h-screen md:h-auto bg-white dark:bg-[#101010] text-neutral-900 dark:text-white flex transition-colors duration-200 overflow-hidden md:overflow-visible">
            {/* Sidebar bên trái (Desktop) & Bottom bar (Mobile) */}
            <Sidebar />

            {/* Khu vực nội dung chính */}
            <div className="flex-1 flex justify-center md:pl-20 h-full md:min-h-screen md:h-auto pb-16 md:pb-0 overflow-hidden md:overflow-visible">
                <div className="w-full max-w-6xl flex justify-center px-4 md:px-6 pt-2 md:pt-3 pb-0 gap-8 h-full md:h-auto">
                    {/* Cột Feed bài viết ở giữa */}
                    <main className="w-full max-w-160 flex flex-col items-center h-full md:h-auto">
                        <Outlet />
                    </main>

                    {/* Cột bên phải: LoginPanel (chỉ hiển thị khi chưa đăng nhập) */}
                    {!isAuthenticated && (
                        <aside className="hidden xl:block w-80 shrink-0">
                            <div className="sticky top-3">
                                <LoginPanel />
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DefaultLayout;
