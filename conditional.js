/**if (true) {
    console.log("Kode program dijalankan");
}

if (false) {
  console.log("Kode program tidak dijalankan");


var mood = "happy";
if (mood == "bahagia") {
    console.log("Saya sedang bahagia hari ini");
}

var angka = 1;
if (angka == "1") {
    console.log("Muncul Angka 1");
}

var mood = "sedih";
if (mood == "happy") {
    console.log("Saya sedang bahagia hari ini");
} else if (mood == "angry") {
    console.log("Saya sedang marah hari ini");
} else {
    console.log("Saya sedang tidak baik-baik saja");
}

var status = "open";
var telur = "ready";
var buah = "sold";
if (status == "open") {
    console.log("Saya akan membeli telur dan buah");
    if (telur == "soldout" && buah == "soldout") {
        console.log("Belanjaan saya tidak lengkap");
    } else if (telur == "sold") {
        console.log("Telur habis, Buah tersedia");
    } else if (buah == "sold") {
        console.log("Buah habis, Telur tersedia");
    } else {
        console.log("Telur dan buah tersedia");
    }
} else {
    console.log("Minimarket tutup, saya pulang lagi");
}

var umur = 19;
if (umur >= 17) {
    console.log("Sudah memiliki KTP");
    if (umur < 20) {
        console.log("Umur kurang dari 20 tahun");
    } else if (umur < 30) {
        console.log("Usia antara 20-30 tahun");
    } else if (umur < 40) {
        console.log("Usia antara 30-40 tahun");
    } else {
        console.log("Sudah berumur");
    }
} else {
    console.log("Belum memiliki KTP");
}*/

var warna = "pink";
switch (warna) {
    case "merah": {
        console.log("Warna merah");
        break;
    }
    case "biru": {
        console.log("Warna biru");
        break;
    }
    case "kuning": {
        console.log("Warna kuning");
        break;
    }
    case "hijau": {
        console.log("Warna hijau");
        break;
    }
    default: {
        console.log("Warna yang dipilih tidak ada");
    }
}