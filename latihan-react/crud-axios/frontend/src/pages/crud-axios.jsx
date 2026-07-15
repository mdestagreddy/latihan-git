import { useEffect, useState } from 'react'
import axios from 'axios'
import baseUrl from '../config/utils'

const BASE_URL = import.meta.env.VITE_BASE_URL;

const CrudAxios = () => {
    const [data, setData] = useState([])
    const [input, setInput] = useState()

    const fetchData = async () => {
        try {
            let res = await axios.get(`${BASE_URL}/movie/api/get`)
            setData(res.data.items)
        } catch(err) {
            console.error(err);
        }
    }
    const createMovie = async (event) => {
        event.preventDefault();
        try {
            await axios.post(`${BASE_URL}/movie/api/post`, input);
            fetchData()
        } catch (err) {
            console.error(err)
        }
    }
    const deleteMovie = async (id) => {
        try {
            await axios.post(`${BASE_URL}/movie/api/delete`, { id })
            fetchData()
        } catch(err) {
            console.error(err)
        } 
    }   

    const handleChange = (event) => {
        let {name, value} = event.target;
        setInput({...input, [name]: value});
    }

    useEffect(() => {
        fetchData();
    }, [])

    return (
        <div className="crud-container">
            <h1 className="crud-title">CRUD AXIOS</h1>
            <p className="crud-subtitle">Kelola daftar film favoritmu</p>
            <div className="div-form-movie">
                <form onSubmit={createMovie}>
                    <label htmlFor="title">Judul</label>
                    <input type="text" onChange={handleChange} id="title" name="title" placeholder="Masukkan judul film" required />

                    <label htmlFor="year">Tahun rilis</label>
                    <input type="number" onChange={handleChange} id="year" name="year" placeholder="Masukkan tahun rilis" required />

                    <input type="submit" value="Kirim" />
                </form>
            </div>
            <div className="div-table-movie">
                <table>
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Judul</th>
                            <th>Tahun rilis</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr className="empty-row">
                                <td colSpan={4}>Belum ada data film</td>
                            </tr>
                        ) : (
                            data.map((item, index) => {
                                return (
                                    <tr key={item.id}>
                                        <td>{index + 1}.</td>
                                        <td>{item.title}</td>
                                        <td>{item.year}</td>
                                        <td>
                                            <button className="btn-delete" onClick={() => deleteMovie(item.id)}>Hapus</button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default CrudAxios