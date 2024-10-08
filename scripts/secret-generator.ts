const secret = Array.from({ length: 10 }, () => bcrypt.genSaltSync(64));
console.log(secret);