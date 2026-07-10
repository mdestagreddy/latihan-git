import './App.css'
import Welcome from './components/Welcome'

function App() {
  let peserta = [
    { nama: "Desta", kota: "Samarinda", umur: 19 },
    { nama: "Dafa", kota: "Enginner", umur: 34 },
    { nama: "Heldi", kota: "Designer", umur: 22 },
    { nama: "Taufiq", kota: "Company", umur: 25 }
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
    </>
  )
}

export default App
