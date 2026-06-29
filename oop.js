console.clear();

// Class pada Javascript
console.log("Class pada Javascript");
console.log("=================");

/// Deklarasi Class
console.log("// Deklarasi Class");

class Car{
    constructor(brand, factory) {
        this.brand = brand;
        this.factory = factory;
        this.sound = "honk! honk!vroomvroom";
    }
}

/// Deklarasi Class dengan variabel
console.log("// Deklarasi Class dengan variabel");

var Var_Car = class {
    constructor(brand, factory) {
        this.brand = brand;
        this.factory = factory;
    }
}

var Var_Car2 = class Car2 {
    constructor(brand, factory) {
        this.brand = brand;
        this.factory = factory;
    }
}

/// Instance Class
console.log("// Instance Class");

var innovam = new Car("Innovam", "Toyotwo");
console.log(innovam);

/// Method
console.log("// Method");

//// Tanpa Parameter
class Car2 {
    constructor(brand) {
        this.carname = brand;
    }
    present() {
        return `I have a ${this.carname}`;
    }
}
var mycar = new Car2("Ford");
console.log(mycar.present());

//// Dengan Parameter
class Car3 {
    constructor(brand) {
        this.carname = brand;
    }
    present(x) {
        return `${x}, I have a ${this.carname}`;
    }
}
var mycar2 = new Car3("Ford");
console.log(mycar2.present("Hello"));

/// Getters dan Setters
console.log("// Getters dan Setters");

class Car4 {
    constructor(brand) {
        this._carname = brand;
    }
    get carname() {
        return this._carname;
    }
    set carname(x) {
        this._carname = x;
    }
}

var mycar3 = new Car4("Ford");
mycar3.carname = "Volvo";
console.log(mycar3.carname);

/// Static Method
console.log("// Static Method");

class Car5 {
    constructor(brand) {
        this.carname = brand;
    }
    static hello() {
        return "Hello!!";
    }
}

var mycar4 = new Car5("Ford");
console.log(Car5.hello());

/// Inheritance
console.log("// Inheritance");

class Animal {
  constructor(name) {
    this.name = name;
  }

  eat() {
    return `${this.name} is eating.`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name); 
    this.breed = breed;
  }

  eat() {
    return `${this.name} the ${this.breed} gobbles up food.`;
  }

  bark() {
    return "Woof! Woof!";
  }
}

var myPet = new Dog("Max", "Labrador");
console.log(myPet.eat()); 
console.log(myPet.bark());
