console.clear();

// Recursive Function
console.log("Recursive Function");
function countDown(number) {
    console.log(number);

    var newNumber = number - 1;

    if (newNumber >= 0) {
        countDown(newNumber);
    }
}

countDown(4);

// First-class Function
console.log("=================");
console.log("First-class Function");

function hitungLingkaran(radius) {
    var pi = 22 / 7;

    function luas(r) { return pi * r * r; }
    function keliling(r) { return 2 * pi * r; }
    console.log(`Luas: ${luas(radius)}`);
    console.log(`Keliling: ${keliling(radius)}`);
}
hitungLingkaran(7);

// Currying Function
console.log("=================");
console.log("Currying Function");

// function
function tambah(a, b) {
    return a + b;
}
console.log(tambah(2, 5));

// currying function
function tambah2(a) {
    return function(b) {
        return a + b;
    }
}
console.log(tambah2(2)(5));

// Imperative Pattern
console.log("=================");
console.log("Imperative Pattern");

function hitungBilanganGenap(arr) {
    var count = 0;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] % 2 === 0) {
            count++;
        }
    }
    return count;
}

var angka = [1, 2, 3, 4, 5, 6];
var jumlahGenap = hitungBilanganGenap(angka);
console.log(jumlahGenap);

// Declarative Pattern
console.log("=================");
console.log("Declarative Pattern");

var angka2 = [1, 2, 3, 4, 5, 6];
var jumlahGenap2 = angka2.filter(function(item) {
    return item % 2 === 0;
}).length;
console.log(jumlahGenap2);

