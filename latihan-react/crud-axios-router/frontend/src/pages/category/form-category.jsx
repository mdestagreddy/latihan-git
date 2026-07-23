import { useEffect, useState } from 'react'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_BASE_URL;

const FormCategory = () => {
    const [data, setData] = useState([])
    const [input, setInput] = useState()
    const [editId, setEditId] = useState(null)
    const [editInput, setEditInput] = useState({ name: '', description: '' })

    const createCategory = async (event) => {
        event.preventDefault();
        try {
            await axios.post(`${BASE_URL}/category/api/new`, input);
            fetchData()
        } catch (err) {
            console.error(err)
        }
    }

    const handleChange = (event) => {
        let {name, value} = event.target;
        setInput({...input, [name]: value});
    }

    return (
        <div className="crud-container">
            <h1 className="crud-title">Buat Kategori</h1>
            <p className="crud-subtitle">Silahkan buat kategori yang Anda masukkan</p>
            <div className="div-form">
                <form onSubmit={createCategory}>
                    <label htmlFor="name">Kategori</label>
                    <input type="text" maxLength={100} onChange={handleChange} id="name" name="name" placeholder="Masukkan nama kategori" required />

                    <label htmlFor="description">Deskripsi</label>
                    <input type="text" onChange={handleChange} id="description" name="description" placeholder="Masukkan deskripsi" required />

                    <input type="submit" value="Kirim" />
                </form>
            </div>
        </div>
    )
}