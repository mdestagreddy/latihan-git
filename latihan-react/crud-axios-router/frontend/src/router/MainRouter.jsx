import { Routes, Route, Link, BrowserRouter } from "react-router"

import Home from '../pages/home'

import TableCrudAxios from "../pages/crud-axios/table"
import FormCrudAxios from "../pages/crud-axios/form"

import TableCategory from "../pages/category/table"
import FormCategory from '../pages/category/form'


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
                        <Route path="crud-axios" element={<TableCrudAxios />} />
                        <Route path="crud-axios/create" element={<FormCrudAxios />} />
                        <Route path="*" element={<NoMatchLayout />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default MainRouter