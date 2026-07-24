import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const FormCrudAxios = () => {
    const [input, setInput] = useState()

    let navigate = useNavigate()

    const [error, setError] = useState("")

    const handleBack = () => {
        navigate(-1)
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await axios.post(`${BASE_URL}/movie/api/post`, input);
            handleBack()
        } catch (err) {
            console.error(err)
            setError(`Gagal mengirim formulir: ${err.message}`)
        }
    }

    const handleChange = (event) => {
        let { name, value } = event.target;
        setInput({ ...input, [name]: value });
        setError('')
    }

    return (
        <div className="crud-container">
            <h1 className="crud-title">CRUD AXIOS</h1>
            <p className="crud-subtitle">Buat film favoritmu</p>
            <div className="div-form">
                <form onSubmit={handleSubmit}>
                    <label htmlFor="title">Judul</label>
                    <input type="text" onChange={handleChange} id="title" name="title" placeholder="Masukkan judul film" required />

                    <label htmlFor="year">Tahun rilis</label>
                    <input type="number" onChange={handleChange} id="year" name="year" placeholder="Masukkan tahun rilis" required />

                    <input type="submit" value="Kirim" />
                    <input onClick={handleBack} value="Batalkan" type="button" style={{ marginTop: '12px'}} />
                </form>
            </div>
            <div style={error == "" ? {display: 'none'} : {color: 'red'}}>{error}</div>
        </div>
    )
}

export default FormCrudAxios