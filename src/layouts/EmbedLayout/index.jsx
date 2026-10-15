import { useEffect } from "react";
import { Outlet } from "react-router";

const EmbedLayout = () => {
    useEffect(() => {
        // Tắt scrollbar-gutter và ẩn thanh cuộn để iframe không bị lệch lề phải
        document.documentElement.classList.add("embed-mode");
        document.documentElement.style.scrollbarGutter = "auto";
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.body.style.margin = "0";

        return () => {
            document.documentElement.classList.remove("embed-mode");
            document.documentElement.style.scrollbarGutter = "";
            document.documentElement.style.overflow = "";
            document.body.style.overflow = "";
            document.body.style.margin = "";
        };
    }, []);

    return (
        <main className="w-full bg-transparent p-0 m-0 overflow-hidden">
            <Outlet />
        </main>
    );
};

export default EmbedLayout;
