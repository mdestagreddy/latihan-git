// Menggunakan for
for (var angka = 2; angka <= 10; angka += 2) {
    console.log(`Iterasi for ke-${angka}`);
}

// Menggunakan while
/// Cara 1
var flag = 2;
while(flag <= 10) {
    console.log(`Iterasi while ke-${flag}`);
    flag += 2;
}

/// Cara 2
var flag2 = 2;
do {
    console.log(`Iterasi while do ke-${flag2}`);
    flag2 += 2;
} while(flag2 <= 10)