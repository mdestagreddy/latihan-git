import { Routes, Route, Link, BrowserRouter } from "react-router";

import CrudAxios from '../pages/crud-axios'
import Home from '../pages/home'
import Category from '../pages/category/main'

import MainLayout from '../layout/MainLayout'
import NoMatchLayout from '../layout/NoMatchLayout'

const MainRouter = () => {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<Home />} />
                        <Route path="category" element={<Category />} />
                        <Route path="crud-axios" element={<CrudAxios />} />
                        <Route path="*" element={<NoMatchLayout />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default MainRouter