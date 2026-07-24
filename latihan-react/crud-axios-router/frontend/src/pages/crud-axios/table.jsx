import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const TableCrudAxios = () => {
    const [data, setData] = useState([])
    const [editId, setEditId] = useState(null)
    const [editInput, setEditInput] = useState({ title: '', year: '' })

    let navigate = useNavigate()

    const fetchData = async () => {
        try {
            let res = await axios.get(`${BASE_URL}/movie/api/get`)
            setData(res.data.items)
        } catch (err) {
            console.error(err);
        }
    }
    const deleteMovie = async (id) => {
        try {
            await axios.post(`${BASE_URL}/movie/api/delete`, { id })
            fetchData()
        } catch (err) {
            console.error(err)
        }
    }
    const updateMovie = async (id) => {
        try {
            await axios.post(`${BASE_URL}/movie/api/update`, {
                id,
                title: editInput.title,
                year: editInput.year,
            })
            cancelEdit()
            fetchData()
        } catch (err) {
            console.error(err)
        }
    }

    const startEdit = (item) => {
        setEditId(item.id)
        setEditInput({ title: item.title, year: item.year })
    }
    const cancelEdit = () => {
        setEditId(null)
        setEditInput({ title: '', year: '' })
    }
    const handleEditChange = (event) => {
        let { name, value } = event.target;
        setEditInput({ ...editInput, [name]: value })
    }

    const handleCreateClick = () => {
        navigate('create')
    }

    useEffect(() => {
        fetchData();
    }, [])

    return (
        <div className="crud-container">
            <h1 className="crud-title">CRUD AXIOS</h1>
            <p className="crud-subtitle">Kelola daftar film favoritmu</p>
            <button onClick={handleCreateClick} className="btn" style={{ marginBottom: '16px' }}>Buat film</button>
            <div className="div-table">
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
                                const isEditing = editId === item.id
                                return (
                                    <tr key={item.id}>
                                        <td>{index + 1}.</td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input-inline"
                                                    type="text"
                                                    name="title"
                                                    value={editInput.title}
                                                    onChange={handleEditChange}
                                                />
                                            ) : (
                                                item.title
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="input-inline"
                                                    type="number"
                                                    name="year"
                                                    value={editInput.year}
                                                    onChange={handleEditChange}
                                                />
                                            ) : (
                                                item.year
                                            )}
                                        </td>
                                        <td>
                                            <div className="action-group">
                                                {isEditing ? (
                                                    <>
                                                        <button className="btn-save" onClick={() => updateMovie(item.id)}>Simpan</button>
                                                        <button className="btn-cancel" onClick={cancelEdit}>Batal</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn-edit" onClick={() => startEdit(item)}>Edit</button>
                                                        <button className="btn-delete" onClick={() => deleteMovie(item.id)}>Hapus</button>
                                                    </>
                                                )}
                                            </div>
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

export default TableCrudAxios