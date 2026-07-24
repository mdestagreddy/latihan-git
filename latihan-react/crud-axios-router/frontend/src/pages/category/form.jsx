import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const FormCategory = () => {
    const [input, setInput] = useState()
    let navigate = useNavigate()

    const [error, setError] = useState("")

    const handleBack = () => {
        navigate(-1)
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await axios.post(`${BASE_URL}/category/api/new`, input);
            handleBack()
        } catch (err) {
            console.error(err)
            setError(`Gagal mengirim formulir: ${err.message}`)
        }
    }

    const handleChange = (event) => {
        let {name, value} = event.target;
        setInput({...input, [name]: value});
        setError('')
    }

    return (
        <div className="crud-container">
            <h1 className="crud-title">Kategori</h1>
            <p className="crud-subtitle">Buat kategori film Anda</p>
            <div className="div-form">
                <form onSubmit={handleSubmit}>
                    <label htmlFor="name">Kategori</label>
                    <input type="text" maxLength={100} onChange={handleChange} id="name" name="name" placeholder="Masukkan nama kategori" required />

                    <label htmlFor="description">Deskripsi</label>
                    <textarea onChange={handleChange} id="description" name="description" placeholder="Masukkan deskripsi" required />

                    <input type="submit" value="Kirim" />
                    <input onClick={handleBack} value="Batalkan" type="button" style={{ marginTop: '12px'}} />
                </form>
            </div>
            <div style={error == "" ? {display: 'none'} : {color: 'red'}}>{error}</div>
        </div>
    )
}

export default FormCategory