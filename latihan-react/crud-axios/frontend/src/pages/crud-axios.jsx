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
        <>
            <h1>CRUD AXIOS</h1>
            <div className="div-form-movie">
                <form onSubmit={createMovie}>
                    <label htmlFor="title">Judul</label>
                    <input type="text" onChange={handleChange} id="title" name="title" placeholder="Judul" required />

                    <label htmlFor="year">Tahun rilis</label>
                    <input type="number" onChange={handleChange} id="year" name="year" placeholder="Tahun" required />

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
                        {data.map((item, index) => {
                            return (
                                <tr key={item.id}>
                                    <td>{item.id}.</td>
                                    <td>{item.title}</td>
                                    <td>{item.year}</td>
                                    <td><button onClick={() => deleteMovie(item.id)}>Hapus</button></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </>
    )
}

export default CrudAxios