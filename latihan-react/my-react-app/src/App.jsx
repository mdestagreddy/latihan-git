import './App.css'
import Welcome from './components/Welcome'
import Counter from './components/Counter'
import { useState } from 'react'


function App() {
  const [count, setCount] = useState(0)
  let peserta = [
    { nama: "Rendra", kota: "Samarinda", umur: 5 },
    { nama: "Andra", kota: "Balikpapan", umur: 6 },
    { nama: "Desta", kota: "Samarinda", umur: 10 },
    { nama: "Dafa", kota: "Samarinda", umur: 11 },
    { nama: "Irti", kota: "Makassar", umur: 25 },
    { nama: "Yul", kota: "Malinau", umur: 17 }
  ];

  return (
    <>
      <div class="card">
        <div class="content">
          {peserta.map((data, index) => {
            return <Welcome key={index} nama={data.nama} kota={data.kota} umur={data.umur} />
          })}
        </div>
      </div>
      <div class="card">
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
        <Counter></Counter>
      </div>
    </>
  )
}

export default App
