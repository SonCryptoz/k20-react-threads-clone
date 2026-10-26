import { Link, NavLink, useLocation } from "react-router";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import CreatePostModal from "@/components/modals/CreatePostModal";
import useSidebar from "./hooks/useSidebar";

const Sidebar = () => {
    const location = useLocation();
    // logic nghiệp vụ (Auth guard, Create Modal, Nav Items, Active State)
    const {
        isCreateModalOpen,
        handleCloseCreateModal,
        handleCreatePostSuccess,
        navItems,
        isItemActive,
    } = useSidebar();

    const handleLogoClick = () => {
        if (location.pathname === "/") {
            window.dispatchEvent(new CustomEvent("home:re-tap"));
        }
    };

    return (
        <>
            {/* DESKTOP SIDEBAR - Cố định bên trái */}
            <aside className="fixed left-0 top-0 bottom-0 w-20 hidden md:flex flex-col items-center justify-between py-6 border-r border-neutral-100 dark:border-neutral-900 z-40 bg-white dark:bg-[#101010] select-none transition-colors duration-200">
                {/* Logo Threads ở trên cùng */}
                <div className="flex items-center justify-center">
                    <Link
                        to="/"
                        onClick={handleLogoClick}
                        className="p-2 hover:scale-105 active:scale-95 transition-transform duration-200"
                        aria-label="Threads Home"
                    >
                        <svg
                            viewBox="0 0 976.98 1082"
                            fill="currentColor"
                            className="w-8 h-9 text-neutral-900 dark:text-white"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M770.347,500.347c-1.355-156.85-86.386-251.367-230.025-251.367-95.872,0-176.499,43.362-218.846,112.472l92.823,64.705c24.053-37.942,57.252-69.448,118.231-69.448,68.77,0,104.341,38.281,114.504,109.423-33.2-5.081-66.399-7.791-100.615-7.791-185.646,0-273.049,84.015-273.049,195.131,0,113.149,87.403,179.548,216.136,179.548,141.267,0,225.621-95.194,260.176-213.086,35.91,16.261,60.64,54.203,60.64,111.116,0,152.447-175.822,235.446-324.881,235.446-219.862,0-363.501-144.316-363.501-379.084,0-287.616,190.05-471.907,445.483-471.907,171.418,0,256.11,75.207,313.701,176.16l94.856-66.399C913.308,94.501,773.396,1,563.358,1,228.653,1,.999,238.478.999,583.008c0,315.057,222.911,497.992,488.507,497.992,219.523,0,441.418-128.055,441.418-347.24,0-114.504-65.721-190.389-160.577-233.413ZM485.441,718.854c-48.444,0-91.129-23.036-91.129-65.383,0-66.738,81.983-87.064,162.271-87.064,30.489,0,60.301,2.032,86.725,7.792-18.971,86.725-75.207,144.655-157.867,144.655Z" />
                        </svg>
                    </Link>
                </div>

                {/* Menu gồm 5 Icons chính ở giữa */}
                <nav className="flex flex-col items-center gap-2">
                    {navItems.map((item) => {
                        const IconComponent = item.icon;
                        const isAction = !item.to;
                        const isActive = isItemActive(item);

                        if (isAction) {
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={item.onClick}
                                    title={item.label}
                                    className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                        isActive
                                            ? "text-neutral-950 dark:text-white bg-neutral-100/90 dark:bg-neutral-800/60 shadow-2xs font-bold"
                                            : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 active:scale-95"
                                    }`}
                                >
                                    <IconComponent size={26} strokeWidth={isActive ? 2.5 : 1.8} />
                                </button>
                            );
                        }

                        return (
                            <NavLink
                                key={item.key}
                                to={item.to}
                                onClick={item.onClick}
                                title={item.label}
                                className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                    isActive
                                        ? "text-neutral-950 dark:text-white bg-neutral-100/90 dark:bg-neutral-800/60 shadow-2xs font-bold"
                                        : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                                }`}
                            >
                                <IconComponent size={26} strokeWidth={isActive ? 2.5 : 1.8} />
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Tiện ích giao diện ở góc dưới (ThemeToggle & Language) */}
                <div className="flex flex-col items-center gap-3">
                    <ThemeToggle />
                    <LanguageSwitcher />
                </div>
            </aside>

            {/* MOBILE BOTTOM NAVIGATION - Cố định dưới chân trang */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 md:hidden flex items-center justify-around border-t border-neutral-100 dark:border-neutral-900/80 z-40 bg-white/95 dark:bg-[#101010]/95 backdrop-blur-md px-2 select-none">
                {navItems.map((item) => {
                    const IconComponent = item.icon;
                    const isAction = !item.to;
                    const isActive = isItemActive(item);

                    if (isAction) {
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={item.onClick}
                                title={item.label}
                                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                                    isActive
                                        ? "text-neutral-950 dark:text-white font-bold"
                                        : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white active:scale-95"
                                }`}
                            >
                                <IconComponent size={25} strokeWidth={isActive ? 2.5 : 1.8} />
                            </button>
                        );
                    }

                    return (
                        <NavLink
                            key={item.key}
                            to={item.to}
                            onClick={item.onClick}
                            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                                isActive
                                    ? "text-neutral-950 dark:text-white font-bold"
                                    : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                            }`}
                        >
                            <IconComponent size={25} strokeWidth={isActive ? 2.5 : 1.8} />
                        </NavLink>
                    );
                })}
            </nav>

            {/* Modal tạo bài viết mới */}
            <CreatePostModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseCreateModal}
                onSuccess={handleCreatePostSuccess}
            />
        </>
    );
};

export default Sidebar;
