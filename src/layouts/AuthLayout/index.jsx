import { Outlet } from "react-router";
import { useTranslation } from "react-i18next";

const AuthLayout = () => {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

    return (
        <div className="min-h-screen bg-white dark:bg-[#101010] text-neutral-900 dark:text-neutral-100 flex flex-col justify-between items-center relative overflow-x-hidden transition-colors duration-200">
            {/* Thành phố sợi chỉ Threads */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-full pointer-events-none select-none z-0">
                <picture className="block w-full">
                    <source
                        srcSet="https://static.cdninstagram.com/rsrc.php/ym/r/gf40BP6SRYU.avif"
                        type="image/avif"
                    />
                    <source
                        srcSet="https://static.cdninstagram.com/rsrc.php/yL/r/ZqRe_VCVa2A.webp"
                        type="image/webp"
                    />
                    <img
                        alt="Threads banner"
                        height="510"
                        width="auto"
                        src="https://static.cdninstagram.com/rsrc.php/yg/r/Jw2-ooKhp4t.webp"
                        className="w-full h-auto object-cover max-h-65 md:max-h-85 invert dark:invert-0 opacity-80 dark:opacity-100 transition-all duration-200"
                    />
                </picture>
            </div>

            {/* Nội dung chính ở giữa */}
            <main className="relative z-10 w-full flex-1 flex flex-col justify-center items-center px-4 py-10 mt-12 md:mt-20">
                <Outlet />
            </main>

            {/* Footer Threads */}
            <footer className="relative z-10 w-full py-6 px-4 text-center text-xs text-neutral-500">
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 max-w-4xl mx-auto">
                    <span>&copy; {currentYear}</span>
                    <a href="#" className="hover:text-neutral-800 hover:underline dark:hover:text-neutral-300 transition-colors">
                        {t("footer.terms")}
                    </a>
                    <a href="#" className="hover:text-neutral-800 hover:underline dark:hover:text-neutral-300 transition-colors">
                        {t("footer.privacy")}
                    </a>
                    <a href="#" className="hover:text-neutral-800 hover:underline dark:hover:text-neutral-300 transition-colors">
                        {t("footer.cookies")}
                    </a>
                    <a href="#" className="hover:text-neutral-800 hover:underline dark:hover:text-neutral-300 transition-colors">
                        {t("footer.report")}
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default AuthLayout;
