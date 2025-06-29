import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "../pages/Home/Home";
import MainLayout from "../layout/MainLayout";
import JavafxPage from "../pages/Javafx/Javafx";
import JavafxLogin from "../pages/Javafx/Login";


const approute = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
    ],
  },
  {
    path: '/javafx/login',
    element: <JavafxLogin />,
  },
  {
    path: '/javafx',
    element: <JavafxPage />,
  },
]);

export default approute;