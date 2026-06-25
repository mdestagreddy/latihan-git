console.clear();

// ES6+
console.log("ES6+");
console.log("=================");
/// Let + Const
console.log("Let + Const");
let nama = "Desta";
const pi = 3.14;
console.log(nama);
console.log(pi);

/// Arrow Functions
console.log("=======");
console.log("Arrow Functions");
const hitungLingkaran = (radius) => {
    let pi = 22 / 7;

    const luas = (r) => pi * r * r;
    const keliling = (r) => 2 * pi * r;
    
    console.log(`Luas: ${luas(radius)}`);
    console.log(`Keliling: ${keliling(radius)}`);
}
hitungLingkaran(7);

/// Default Parameter
console.log("=======");
console.log("Default Parameter");
function myFuncParameter(a, b = 5) {
    return a + b;
}
console.log(myFuncParameter(2, 3));
console.log(myFuncParameter(2));