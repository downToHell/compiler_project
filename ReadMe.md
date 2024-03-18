# HY Compilers Project SS2024

This is my personal and somewhat painful implementation of the compiler project posed by `CSM14204 Compilers` at University of Helsinki. Here is a brief overview of its features, an installation guide, special abilities and deficiencies and information on how to use its end-to-end test framework.

- [Installation](#installation)
- [Structure](#structure)
- [Running the compiler](#running-the-compiler)
- [Features](#features)
- [Test Framework](#test-framework)
- [Known Issues](#known-issues)

## Installation

To run this compiler a JavaScript runtime of sorts is required. I'd suggest NodeJS for this purpose because it is also the platform I used to develop it with and I am certain it cooperates with! I've used NodeJS version 18.14.2 but you may use any more recent version as well. To get your copy of NodeJS on Ubuntu run:

```sh
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
sudo apt-get install -y nodejs
```

or refer to [NodeSource](https://github.com/nodesource/distributions/blob/master/README.md) for more accurate instructions. Once you've installed NodeJS run: `node -v` and check if it is the right version.

After you successfully installed NodeJS, you need to run `npm install` or `npm i` inside the project's directory to install the necessary dependencies.

## Structure

```
└── compiler_project
    ├── src                 # source files
    ├── test                # unit tests
    ├── test_programs       # end-to-end tests
    ├── assembler.mjs       # fancy javascript version of the assembler.py template
    ├── compiler_suite.mjs  # required by the compiler, this is where all the compiling resides
    ├── compiler.mjs        # compiler script - this is the entry point to the project
    ├── rasm.sh             # remote assembler (unless you own a Mac none of your concern)
    ├── ReadMe.md
    ├── test_parser.mjs     # yes, I wrote a distinct parser for my e2e tests  
    └── test_runner.mjs     # executes the e2e tests on your machine :)
```

## Running the compiler

To make use of the compiler and run a simple program you can use one of three strategies:
1. write a source code file and pass it to the compiler script (option `run`)
2. use direct input to the compiler (pass it as a command line argument)
3. fire up the repl/interpreter

```
usage: compiler.mjs <command> [file/input]

AVAILABLE COMMANDS:
    asm, ir, interpret, repl, compile, run

ENVIRONMENT VARIABLES:
    RASM_HOST_PATH=<not set>
    RASM_HOST_KEY=<not set>
    CSCP_ASM=<not set>
```

### Remote assembler

The compiler comes with an integrated remote assembler in case you don't own a machine that understands x86_64 assembly. The remote assembler is called automatically by the compiler if you set environment variables `RASM_HOST_PATH`, `RASM_HOST_KEY` and `CSCP_ASM`. You can set the first two variables to your preferred remote Linux machine, however, you should set `CSCP_ASM` to `rasm` if you want to use the remote assembler.

- `RASM_HOST_PATH`: the scp path where you want your assembly files to be uploaded and compiled
- `RASM_HOST_KEY`: the ssh key that is used to access the machine defined by `RASM_HOST_PATH`
- `CSCP_ASM`: set this to `rasm` if you want to use the remote assembler or unset/set it to `as` to use a local instance

## Features

So far the compiler implements the following language structures as defined by [HY Compilers](https://hy-compilers.github.io/spring-2024/project/):

- Integer literals
- Boolean literals
- Binary operators `+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `and`, `or`
- Unary operators `-` and `not`
- builtin functions `print_int`, `read_int` and `print_bool`
- Blocks
- Variables (typed and untyped)
- Assignments
- if-then-else
- While loops
- `break` and `continue`
- Functions
- Pointers

### Special features

There are some special features in my language implementation that are not mentioned by the specification:

- builtin `pow` for exponentiation (Limitation: does not support negative exponents and treats `0 ** 0` as undefined)
- Binary operator `**` (which calls the above mentioned function)
- short-hand syntax for one line functions e.g. `fun square(x: Int): Int = x * x`

### Design decisions

**Short-Hand Syntax**
- The short-hand syntax for functions inserts an implicit return right after the `=`-sign and parses anything but top-level blocks. So `fun square(x: Int): Int = { return x * x }` would be considered illegal and hence would not compile

**Returns**
- Return has been implemented as such that on a missing return expression at the end of a block it is automatically inserted by the parser at compile-time
- Return from top-level code is not allowed, so `var x = 3; return` would not compile
- There is a `unit`-Literal in the language eventhough it was dropped mid-course and it can be returned i.e. `return unit` works

**Globals**
- Accessing globals from a function is undefined behaviour: `var x = 3; fun print_x(): Unit { print_int(x) }`

**Pointers**
- Combinations of unary-`*` and `&` are not allowed, so this `&*p` cannot be used. The only legal semantic unit to follow an `&` is an identifier
- Assigning function values is allowed. Example:
```kotlin
fun foo(): Int {
    return 3;
}

fun ret(): (() => Int)* {
    return &foo;
}
var ptr = *ret();
print_int(ptr()) // prints 3
```

**Other**
- The compiler does not insert any `print_int`'s or `print_bool`'s itself. All printing has to be done explicitly in code

## Test Framework

### Component tests

To ensure that the components individually make sense and function correctly, I wrote several different types of tests. Specifically, I designed a wrapper library around `node:assert` called `tree_tester.mjs` which enables my compiler to test each branch of an AST node for various attributes. To run the component tests you can simply run:

```sh
npm run test # or npm test
```

### End-To-End Test Framework

The e2e test framework in use here supports 4 kinds of commands: `describe`, `input`, `assert` and `fails`. While most of them are pretty self-explanatory, here a short note on each of them nonetheless:

| command | type | explanation |
| ------- | ---- | ----------- |
| `describe` | `string` | test name that will later show up in the console once you run your tests |
| `input` | `array` or `string` | inputs to the program (retrieved by `read_int()`) |
| `assert` | `array` or `string` | expected output values from the program (i.e. calls to `print_int` or `print_bool`) |
| `fails` | `void` | expects that the execution of the test fails |

All test command are prefixed by the command prefix `#`. This decision has been made as to design the framework as non-invasive as possible i.e. test files can still be compiled if they contain a single test only. To separate test cases from one another use the delimiter `---`. Test commands are to be coded in the following manner:

**Example**

```
# describe(my test goes here)
# input([2, 5])
print_int(read_int() * read_int())
# assert(10)
```

**Please note**:
- both `input` and `assert` can either be comma separated values or arrays of strings
- `assert` and `fail` can only be used exclusively
- the use of `input` is optional

**Running the tests**

To run the end-to-end test framework you can use the following command. Please note however, that the remote assembler _cannot_ be used with e2e tests. They only run on a local machine which is capable to understand x86_64 assembly!

```sh
npm run e2e
```

## Known Issues

- nothing here :) all fixed!!
