create table mahasiswa{
    nim INT(10) PRIMARY KEY,
    nama CHAR(255) NOT NULL,
    prodi CHAR(255) NOT NULL,
    jenisKelamin enum('Laki-laki', 'Perempuan'),
    alamat TEXT() NOT NULL,
    nohp CHAR(25)
};

INSERT INTO mahasiswa(nim, nama, prodi, jenisKelamin, alamat, nohp)
VALUES (12345, "M. Desta Greddy", "TIK", "Laki-laki", "Samarinda", "081234567890");

UPDATE mahasiswa
SET alamat="Samarinda - TikTok"
WHERE nim=12345;

DELETE FROM mahasiswa WHERE nim=12345;

INSERT INTO mahasiswa(nim, nama, prodi, jenisKelamin, alamat, nohp)
VALUES (54321, "realme", "TIK", "Laki-laki", "Samarinda", "081122334455");