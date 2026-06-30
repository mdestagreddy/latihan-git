console.clear();

var nilaiArray = [2, 5, 1, 3, 4];
var nilaiArraySebelumnya = [...nilaiArray];

function hasilArray(nama, detail, tampilkanLength = true) {
    if (JSON.stringify(nilaiArray) === JSON.stringify(nilaiArraySebelumnya) || detail != null) {
        console.log(`[${nama}]${detail != null ? " " + detail : ""}`, nilaiArray);
    } else {
        console.log(`[${nama}] Sebelum:`, nilaiArraySebelumnya);
        console.log(`[${nama}] Setelah:`, nilaiArray);
    }
    nilaiArraySebelumnya = typeof nilaiArray == "object" ? [...nilaiArray] : nilaiArray;
    if (tampilkanLength) console.log(`Panjang/length:`, nilaiArray.length);
}

// length
hasilArray("length");

// push
nilaiArray.push(7);
hasilArray("push");

// pop
nilaiArray.pop();
hasilArray("pop");

// unshift
nilaiArray.unshift(9);
hasilArray("unshift");

// shift
nilaiArray.shift();
hasilArray("shift");

// join
nilaiArray = ["Andra", "Taufik", "Desta"];
hasilArray("join", "Sebelum:", false);
nilaiArray = nilaiArray.join(" ");
hasilArray("join", "Setelah:");

// split
nilaiArray = "Muhammad Desta Greddy Aulia Rahman";
hasilArray("split", "Sebelum:", false);
nilaiArray = nilaiArray.split(" ");
hasilArray("split", "Setelah:");

// sort/reverse
nilaiArray = ["Andra", "Taufik", "Hendri", "Desta", "Dedi"];
hasilArray("sort", "Sebelum:", false);
nilaiArray = nilaiArray.sort();
hasilArray("sort", "Sort:", false);
nilaiArray = nilaiArray.reverse();
hasilArray("sort", "Reverse:");

// slice
nilaiArray = nilaiArray.slice(1, 4);
hasilArray("slice");

// splice
nilaiArray.splice(2, 0, "Heldi", "Dennis");
hasilArray("splice");

// looping array
console.log("=====================\nLooping Array")
console.log("// for");
nilaiArray = ["Jeruk", "Mangga", "Apel"];
for (var i = 0; i < nilaiArray.length; i++) {
    console.log(nilaiArray[i]);
}

console.log("// while");
nilaiArray = ["John", "Doe", "Jack"];
var i = 0;
while (i < nilaiArray.length) {
    console.log(nilaiArray[i]);
    i++;
}