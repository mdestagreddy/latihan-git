console.clear();

// Objec JavaScript
var car = {
    brand: "Ferrari",
    type: "Sports Car",
    price: 50000000,
    "horse power": 986
}

console.log("=================");
// Mengakses Nilai pada Object
var myMotorCycle = {
    brand: "Honda",
    type: "CBR",
    "price tag": 30000000
}

console.log(myMotorCycle.brand);
console.log(myMotorCycle["price tag"]);

console.log("=================");
//Array of Object
var orang = [
    {
        nama: 'Muhammad Desta Greddy Aulia Rahman',
        umur: 19,
        jenis_kelamin: 'laki-laki'
    },
    {
        nama: 'Tiktok',
        umur: 32,
        jenis_kelamin: "laki-laki"
    },
    {
        nama: 'Intan Lestari',
        umur: 24,
        jenis_kelamin: "perempuan"
    }
]
// Array Iteration .forEach()
orang.forEach(function(item, index) {
    console.log(`Data orang no-${index + 1}`);
    console.log(item.nama);
    console.log(item.umur);
    console.log(item.jenis_kelamin);
});

console.log("=================");
// Array Iteration .map()
var mobil = [
    { merk: "BMW", warna: "merah", tipe: "sedan" },
    { merk: "toyota", warna: "hitam", tipe: "box" },
    { merk: "audi", warna: "biru", tipe: "sedan" }
]
var arrayWarna = mobil.map(function(item){
    return item.warna;
})
console.log(arrayWarna);

console.log("=================");
// Array Iteration .filter()
var arrayOrangFilter= orang.filter(function(item){
    return item.umur > 20;
})
console.log(arrayOrangFilter);