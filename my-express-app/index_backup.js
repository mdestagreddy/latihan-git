const express = require('express')
const app = express()
const port = 3000

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let mahasiswa = [
    {nim: 1122, nama: "Muhammad Desta Greddy Aulia Rahman", alamat: "MT Haryono"},
    {nim: 2211, nama: "Andra Ramadhani Widodo", alamat: "Teuku Umar"},
    {nim: 3221, nama: "Tri Agil Pribadi", alamat: "Untung Suropati"},
    {nim: 4221, nama: "Muhammad Rendra Fachrizal", alamat: "Rapak Dalam"},
    {nim: 5141, nama: "Yulita Danel", alamat: "Sempaja"},
    {nim: 6111, nama: "Irtiyaah Nailah Zaky Amany", alamat: "Bengkuring"},
    {nim: 5225, nama: "Heldi Saputra", alamat: "Mangkuraja"},
    {nim: 3444, nama: "Debby Fahrizal Rahman", alamat: "Sempaja"},
]

function getObjectMahasiswaByQuery(query) {
    let filtered = [...mahasiswa];
    let queryDetected = Object.keys(query)[0];

    for (let q in query) {
        if (Number(query[q])) {
            filtered = filtered.filter(item => item[q] === Number(query[q]));
        } else if (query[q]) {
            filtered = filtered.filter(item => new RegExp(query[q], "i").test(item[q]));
        }
    }

    if (filtered.length === 0) {
        return {
            result: { success: false, error: `Data tidak ditemukan untuk pencarian ${queryDetected}: ${query[queryDetected]}` },
            queryDetected
        };
    }

    return { result: { items: filtered, success: true }, queryDetected };
}

function getQueryString(query) {
    let result = "";
    let length = Object.keys(query).length;
    let index = 0;
    for (let q in query) {
        result += `${q}=${query[q]}${index < length - 1 ? "&" : ""}`
        index++;
    }
    return result;
}

const getObjectMahasiswa = (req, res) => {
    let objectMahasiswa = getObjectMahasiswaByQuery(req.query)
    res.type('application/json')
    res.send(objectMahasiswa.result)
}

const getMahasiswa = async (req, res) => {
    let result = "";
    let response = await fetch(`${BASE_URL}/object_mahasiswa?${getQueryString(req.query)}`);
    let json = await response.json();

    if (json.items) {
        json.items.forEach(function(item, index) {
            result += `<span style="font-size: 24px"><b>${index + 1}.</b> NIM: ${item.nim}<br>&emsp;Nama: ${item.nama}<br>&emsp;Alamat: ${item.alamat}<br><br></span>`
        })
    } else {
        result += json.error;
    }
    
    res.send(result)
}

app.get('/', (req, res) => {
    res.send(`Homepage by mdestagreddy<br>
        <form action="/mahasiswa">Search Mahasiswa: <input name="nama" type="search" /><input type="submit" value="Search" /></form>
        <form action="/object_mahasiswa">Search Object Mahasiswa: <input name="nama" type="search" /><input type="submit" value="Search" /></form>`)
})

app.get('/mahasiswa', getMahasiswa)
app.get('/object_mahasiswa', getObjectMahasiswa)

app.listen(port, () => {
    console.log(`App listening on port http://localhost:${port}`)
})
