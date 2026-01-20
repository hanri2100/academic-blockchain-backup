import bcrypt from "bcrypt";
const password = "password123";
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  console.log("--- SALIN HASH DI BAWAH INI ---");
  console.log(hash);
  console.log("-------------------------------");
});
