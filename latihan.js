console.log("Halo semua");

var nama = "John Doe";
var hari = "Selasa";
var nomorUrut = 12;
var quote = "Hari ini adalah hari";

console.log(`Nama: ${nama}\nNomor Urut: ${nomorUrut}\n\n${quote} ${hari}.`);

var open = false;
if (open == true) {
    console.log("BUKA");
} else {
    console.log("TUTUP");
}

// Operator Aritmatika
console.log("=====================");
console.log("Operasi Aritmatika");

var a = 5;
var b = 5;
var tambah = a + b;
var kurang = a - b;
var kali = a * b;
var bagi = a / b;
var modulus = a % b;

console.log(`hasil tambah: ${tambah}\nhasil kurang: ${kurang}\nhasil kali: ${kali}\nhasil bagi: ${bagi}\nhasil modulus: ${modulus}`);

// Operator Perbandingan
console.log("=====================");
console.log("Operasi Perbandingan");

console.log(1 == "1");
console.log(1 === "1");
console.log(1 >= 1);
console.log(1 > 1);

// Operator Kondisional (&& AND, || OR)
console.log("=====================");
console.log("Operator Kondisional");

/**
console.log(true || true);
console.log(true || false);
console.log(true && true);
console.log(true && false);
*/
var status = "open";
var jamBuka = 9;

console.log(status == "open" && jamBuka >= 9);

// JavaScript Strings
console.log("=====================");
console.log("JavaScript Strings");

var word = "Web Programming";
var word2 = " JavaScript";
console.log(`${word}\nPanjang karakter: ${word.length}\nIndeks karakter ke-5: ${word.charAt(5)}`);
console.log(word.concat(word2));
console.log(`${word}${word2}, tahun 2026`);
console.log(word.indexOf("Web"));
console.log(word.indexOf("m"));
console.log(word.indexOf("Node.js"));
console.log(word.substring(4));
console.log(word.toUpperCase());
console.log(word.toLowerCase());

var word3 = " Web Programming Node.js dan React ";
console.log(word3.trim());
console.log(word.replace("r", "R"));
console.log(word.replaceAll(" ", "-"));

// Mengubah menjadi string
// .toString()
// String(namaVariable)
console.log("=====================");
console.log("Mengubah menjadi string");

var angka = 15;
console.log(angka);
console.log(angka+angka);
angka = angka.toString();
console.log(angka);
console.log(angka+angka);

// Mengubah menjadi Angka/Number
// parseInt(namaVariable)
// parseFloat(namaVariable)
console.log("=====================");
console.log("Mengubah menjadi Angka/Number");

var kata = "7";
console.log(kata);
console.log(Number(kata));
console.log(parseInt(kata));

var angka1 = 1.5;
var angka2 = 2.7;

console.log(angka1);
console.log(angka2);

var angka3 = angka1 + angka2;
console.log(angka3);