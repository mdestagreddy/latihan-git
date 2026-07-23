import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const FormCategory = () => {
    const [input, setInput] = useState()
    let navigate = useNavigate()

    const handleBack = () => {
        navigate(-1)
    }

    const createCategory = async (event) => {
        event.preventDefault();
        try {
            await axios.post(`${BASE_URL}/category/api/new`, input);
            handleBack()
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
            <p className="crud-subtitle">Silahkan membuat kategori film Anda</p>
            <button onClick={handleBack} className="btn" style={{ marginBottom: '16px' }}>Kembali ke tabel kategori</button>
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

export default FormCategory