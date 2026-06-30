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

/// Template Literal
console.log("=======");
console.log("Template Literal");

let namaSaya = "Muhammad Desta Greddy Aulia Rahman";
let hasilTemplate = `Halo, perkenalkan nama saya ${namaSaya}`;
console.log(hasilTemplate);

/// Enhanced object literals
console.log("=======");
console.log("Enhanced object literals");

let umur = 19;

let person = {
    namaSaya,
    umur
}
console.log(person);

/// Destructuring
console.log("=======");
console.log("Destructuring");
//// Destructuring Array
console.log("====");
console.log("Destructuring Array");

let number = [1, 5, 6, 7, 8];
/**let num1 = number[0],
num2 = number[1],
num3 = number[2],
num4 = number[3],
lastNum = number[4];*/

let [num1, , , , lastNum] = number;

console.log(lastNum);

//// Destructuring Object
console.log("====");
console.log("Destructuring Object");

let person1 = {
    namaku: namaSaya,
    umurku: umur,
    tinggiku: 170
}
/**let namaPerson = person1.namaku;
let umurPerson = person1.umurku;
let tinggiPerson = person1.tinggiku;*/
let {namaku, umurku, tinggiku} = person1;

console.log(namaku);

/// Rest Parameter
console.log("=======");
console.log("Rest Parameter");

//// Rest Parameter Array
console.log("====");
console.log("Rest Parameter Array");

let [number1, number2, number3, number4, lastNumber] = number;
let footballers = ["Messi", "Ronaldo", "Mbappe", "Halland", "Neymar"];
let [foot1, ...restFoots] = footballers;

console.log(foot1);
console.log(restFoots[1]);

//// Rest Parameter Object
console.log("====");
console.log("Rest Parameter Object");

let person2 = {
    namakuu: namaSaya,
    umurkuu: umur,
    tinggikuu: 170
}

let {namakuu, ...restPerson} = person2;
console.log(namakuu);
console.log(restPerson);

/// Spread Operator
console.log("=======");
console.log("Spread Operator");
//// Spread Operator Array
console.log("====");
console.log("Spread Operator Array");

let buah = ["Stroberi", "Mangga", "Apel"];
/**buah.unshift("Mangga", "Jeruk");
buah.push("Durian");*/

buah = ['Mangga', ...buah, "Jeruk", "Durian"];
console.log(buah);

//// Spread Operator Object
console.log("====");
console.log("Spread Operator Object");

let botol = {
    merek: "Aqua",
    ukuran: "600ml",
    harga: 5000
}
/**botol.warna = "Biru";
botol.kemasan = "Plastik";
botol.bentuk = "Bulat"*/
botol = {warna: "Biru", ...botol, kemasan: "Plastik", bentuk: "Bulat"};
console.log(botol);