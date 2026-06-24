var nilaiArray = [2, 5, 1, 3, 4];
var nilaiArraySebelumnya = [...nilaiArray];

function hasilArray(nama, detail) {
    if (JSON.stringify(nilaiArray) === JSON.stringify(nilaiArraySebelumnya) || detail != null) {
        console.log(`[${nama}]${detail != null ? " " + detail : ""} ${JSON.stringify(nilaiArray)}`);
    } else {
        console.log(`[${nama}] Sebelum: ${JSON.stringify(nilaiArraySebelumnya)}`);
        console.log(`[${nama}] Sesudah: ${JSON.stringify(nilaiArray)}`);
    }
    nilaiArraySebelumnya = typeof nilaiArray == "object" ? [...nilaiArray] : nilaiArray;
}

console.log(nilaiArray[0]);
console.log(nilaiArray[2]);
hasilArray("main");

// length
console.log(`Panjang array: ${nilaiArray.length}`);

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
hasilArray("join", "Sebelum:");
nilaiArray = nilaiArray.join(" ");
hasilArray("join", "Sesudah:");

// split
nilaiArray = "Muhammad Desta Greddy Aulia Rahman";
hasilArray("split", "Sebelum:");
nilaiArray = nilaiArray.split(" ");
hasilArray("split", "Sesudah:");

// sort