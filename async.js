console.clear();

// Async (asynchronous)
console.log("Async (asynchronous)");
console.log("=================");

/// Promise
console.log("// Promise");

// Contoh
var isMomHappy = true;

var willIGetNewPhone = new Promise(
    function(resolve, reject) {
        if (isMomHappy) {
            var phone = {
                brand: "Infinix",
                type: "Hot 60 Pro",
                color: "Silver"
            };
            resolve(phone);
        } else {
            var reason = new Error("Mom is not happy");
            reject(reason);
        }
    }
);

function askMom() {
    willIGetNewPhone
        .then(function(fulfilled) {
            console.log(fulfilled);
        })
        .catch(function(error) {
            console.log(error.message);
        });
}
askMom();

// Contoh dengan parameter
function periksaDataPasien(nomorIdPasien) {
    var dataPasien = [
        {id: 1, nama: "John", jenisKelamin: "Laki-laki"},
        {id: 2, nama: "Michael", jenisKelamin: "Laki-laki"},
        {id: 3, nama: "Sarah", jenisKelamin: "Perempuan"},
        {id: 4, nama: "Frank", jenisKelamin: "Laki-laki"},
    ];

    return new Promise(function(resolve, reject) {
        var pasien = dataPasien.find(x => x.id === nomorIdPasien);
        if (pasien === undefined) {
            reject("data pasien tidak tersedia");
        } else {
            resolve(pasien);
        }
    });
}

periksaDataPasien(4).then(function(data) {
   console.log(data); 
}).catch(function(err) {
    console.log(err);
})