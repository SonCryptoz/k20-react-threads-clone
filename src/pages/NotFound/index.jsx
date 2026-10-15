import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    // Cập nhật tiêu đề tab
    useDocumentTitle(t("not_found.page_title"));

    // Xử lý nút quay lại
    const handleGoBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/", { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#101010] text-neutral-900 dark:text-white flex flex-col justify-between items-center px-4 relative select-none transition-colors duration-200">
            {/* Nội dung trung tâm căn giữa tuyệt đối */}
            <main className="flex-1 flex flex-col items-center justify-center text-center max-w-sm px-2">
                <h1 className="text-[15px] sm:text-base font-bold text-neutral-900 dark:text-white leading-snug whitespace-pre-line">
                    {t("not_found.title")}
                </h1>

                <p className="mt-3.5 text-xs sm:text-sm text-neutral-500 dark:text-[#777777] leading-relaxed whitespace-pre-line">
                    {t("not_found.desc")}
                </p>

                <Button
                    type="button"
                    onClick={handleGoBack}
                    className="mt-5 h-9 px-4 rounded-xl text-sm font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all cursor-pointer active:scale-95"
                >
                    {t("not_found.go_back")}
                </Button>
            </main>

            {/* Footer ở đáy trang theo đúng ảnh Threads real */}
            <footer className="w-full py-6 px-4 text-center text-xs text-neutral-500 dark:text-[#777777]">
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 max-w-4xl mx-auto">
                    <span>&copy; {currentYear}</span>
                    <a
                        href="#"
                        className="hover:text-neutral-800 hover:underline dark:hover:text-neutral-300 transition-colors"
                    >
                        {t("footer.terms")}
                    </a>
                    <a
                        href="#"
                        className="hover:text-neutral-800 hover:underline dark:hover:text-neutral-300 transition-colors"
                    >
                        {t("footer.privacy")}
                    </a>
                    <a
                        href="#"
                        className="hover:text-neutral-800 hover:underline dark:hover:text-neutral-300 transition-colors"
                    >
                        {t("footer.cookies")}
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default NotFoundPage;
