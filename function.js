console.clear();

// Function JavaScript
console.log("Function JavaScript");
// tanpa return
console.log("// tanpa return");
function tampilkan() {
    console.log("halo!");
}
tampilkan();

// dengan return
console.log("// dengan return");
function munculkanAngkaDua() {
    return 2;
}
var tampung = munculkanAngkaDua();
console.log(tampung);

// dengan parameter
console.log("// dengan parameter");
function kalikanDua(angka) {
    return angka * 2;
}
var tampung = kalikanDua(2);
console.log(tampung);

// parameter lebih dari satu dan nilai default
console.log("// parameter lebih dari satu dan nilai default");
function tampilkanAngka(angkaPertama, angkaKedua = 2) {
    return angkaPertama + angkaKedua;
}
console.log(tampilkanAngka(5, 3));
console.log(tampilkanAngka(6));

// Anonymous Function
console.log("=======================");
console.log("Anonymous Function");

var fungsiPerkalian = function(angkaPertama, angkaKedua) {
    return angkaPertama * angkaKedua;
}
console.log(fungsiPerkalian(2, 5));