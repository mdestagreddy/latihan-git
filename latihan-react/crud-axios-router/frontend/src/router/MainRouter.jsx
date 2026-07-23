import { Routes, Route, Link, BrowserRouter } from "react-router"

import CrudAxios from '../pages/crud-axios'
import Home from '../pages/home'
import TableCategory from "../pages/category/table-category"
import FormCategory from '../pages/category/form-category'

import MainLayout from '../layout/MainLayout'
import NoMatchLayout from '../layout/NoMatchLayout'

const MainRouter = () => {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<Home />} />
                        <Route path="category" element={<TableCategory />} />
                        <Route path="category/create" element={<FormCategory />} />
                        <Route path="crud-axios" element={<CrudAxios />} />
                        <Route path="*" element={<NoMatchLayout />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default MainRouter