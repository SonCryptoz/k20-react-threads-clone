import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { getAccessToken } from "./utils/tokenStorage";
import { fetchCurrentUser } from "./features/authSlice";
import Skeleton from "./components/ui/skeleton";
import { Toaster } from "./components/ui/toast";

function App() {
    const dispatch = useDispatch();
    const { isInitialized } = useSelector((state) => state.auth);

    useEffect(() => {
        if (getAccessToken()) {
            dispatch(fetchCurrentUser({ minDelay: 400 }));
        }
    }, [dispatch]);

    return (
        <ThemeProvider>
            <AppRoutes />
            <Skeleton isVisible={!isInitialized} />
            <Toaster />
        </ThemeProvider>
    );
}

export default App;
