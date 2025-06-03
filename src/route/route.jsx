import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "../pages/Home/Home";
import MainLayout from "../layout/MainLayout"; // Changed from "../layouts/MainLayout"


const approute = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            { 
                path: '/', 
                element: <Home /> 
            },
            
        ]
    }
]);

export default approute;
