import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const TableCategory = () => {
    const [data, setData] = useState([])
    const [editId, setEditId] = useState(null)
    const [editInput, setEditInput] = useState({ name: '', description: '' })

    let navigate = useNavigate()

    const fetchData = async () => {
        try {
            let res = await axios.get(`${BASE_URL}/category/api/get`)
            setData(res.data.items)
        } catch(err) {
            console.error(err);
        }
    }
    const deleteCategory = async (id) => {
        try {
            await axios.post(`${BASE_URL}/category/api/delete`, { id })
            fetchData()
        } catch(err) {
            console.error(err)
        } 
    }
    const updateCategory = async (id) => {
        try {
            await axios.post(`${BASE_URL}/category/api/update`, {
                id,
                name: editInput.name,
                description: editInput.description
            })
            cancelEdit()
            fetchData()
        } catch(err) {
            console.error(err)
        }
    }

    const startEdit = (item) => {
        setEditId(item.id)
        setEditInput({ name: item.category_name, description: item.category_desc })
    }
    const cancelEdit = () => {
        setEditId(null)
        setEditInput({ name: '', description: '' })
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
            <h1 className="crud-title">Kategori</h1>
            <p className="crud-subtitle">Temukan film menurut kategori</p>
            <button onClick={handleCreateClick} className="btn" style={{ marginBottom: '16px' }}>Buat kategori</button>
            <div className="div-table">
                <table>
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Kategori</th>
                            <th>Deskripsi</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr className="empty-row">
                                <td colSpan={4}>Belum ada data kategori</td>
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
                                                    maxLength={100  }
                                                    name="name"
                                                    value={editInput.name}
                                                    onChange={handleEditChange}
                                                />
                                            ) : (
                                                item.category_name
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <textarea
                                                    className="input-inline"
                                                    type="text"
                                                    name="description"
                                                    value={editInput.description}
                                                    onChange={handleEditChange}
                                                    style={{ height: '96px'}}
                                                ></textarea>
                                            ) : (
                                                item.category_desc
                                            )}
                                        </td>
                                        <td>
                                            <div className="action-group">
                                                {isEditing ? (
                                                    <>
                                                        <button className="btn-save" onClick={() => updateCategory(item.id)}>Simpan</button>
                                                        <button className="btn-cancel" onClick={cancelEdit}>Batal</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn-edit" onClick={() => startEdit(item)}>Edit</button>
                                                        <button className="btn-delete" onClick={() => deleteCategory(item.id)}>Hapus</button>
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

export default TableCategory