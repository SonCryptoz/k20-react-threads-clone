import { Route, Routes } from "react-router";

import AuthLayout from "@/layouts/AuthLayout";
import DefaultLayout from "@/layouts/DefaultLayout";
import EmbedLayout from "@/layouts/EmbedLayout";

import ForgotPasswordPage from "@/pages/Auth/ForgotPassword";
import LoginPage from "@/pages/Auth/Login";
import RegisterPage from "@/pages/Auth/Register";
import ResetPasswordPage from "@/pages/Auth/ResetPassword";
import VerifyEmailPage from "@/pages/Auth/VerifyEmail";
import HomePage from "@/pages/Home";
import NotFoundPage from "@/pages/NotFound";
import PostDetailPage from "@/pages/PostDetail";
import EmbedPage from "@/pages/Embed";
import ProfilePage from "@/pages/Profile";
import PrivateRoute from "./PrivateRoute";
import ActivityPage from "@/pages/Activity";
import SearchPage from "@/pages/Search";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<DefaultLayout />}>
                <Route index element={<HomePage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path=":username/post/:postId" element={<PostDetailPage />} />

                {/* Các tuyến đường yêu cầu đăng nhập (Private Routes) */}
                <Route element={<PrivateRoute />}>
                    <Route path="activity" element={<ActivityPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path=":username" element={<ProfilePage />} />
                </Route>
            </Route>
            <Route element={<AuthLayout />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="verify-email" element={<VerifyEmailPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
            </Route>
            <Route element={<EmbedLayout />}>
                <Route path=":username/post/:postId/embed" element={<EmbedPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRoutes;
