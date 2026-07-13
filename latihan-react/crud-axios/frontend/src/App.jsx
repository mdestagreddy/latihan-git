import { useEffect, useState } from 'react'
import './App.css'
import './style.css'
import axios from 'axios'
import baseUrl from './config/utils'

function App() {
const initialState = {movieTitle:"", movieYear:0}
const [data, setData] = useState([])
const [input, setInput] = useState(initialState)

const ambilData = () => {
  axios.get(`${baseUrl}/movie/api/get`).then((res)=>{
        setData(res.data.items)
      })
}

const handleSubmit = async (event) => {
  event.preventDefault()
  try{
    // console.log(input)
    await axios.post(`${baseUrl}/movie/api/post`,{title: input.movieTitle, year: Number(input.movieYear)})
    ambilData()
    setInput(initialState)
  }catch(err){
    alert(err)
  }
  
}

const handleChange = (event) => {
  let {name, value} = event.target
  setInput({...input, [name]: value})
}

  useEffect(()=>{
    ambilData()
  },[])

  return (
    <>
      <h1>CRUD AXIOS</h1>
      <div className='div-form-input'>
        <form action="/action_page.php" onSubmit={handleSubmit}>
          <label htmlFor="movieTitle">Movie Title</label>
          <input onChange={handleChange} type="text" id="movieTitle" name="movieTitle" />

          <label htmlFor="movieYear">Movie Year</label>
          <input onChange={handleChange} type="number" id="movieYear" name="movieYear" />
          
          <input type="submit" value="Submit" />
        </form>
      </div>


            <table className="table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Title</th>
                        <th>Year</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                  {data.map((item,index)=>{
                    return (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.title}</td>
                        <td>{item.year}</td>
                        <td>Delete</td>
                    </tr>
                    )
                  })}
                </tbody>
            </table>
    </>
  )
}

export default App