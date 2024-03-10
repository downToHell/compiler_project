# HY Compilers Project SS2024

This is my personal and somewhat painful implementation of the compiler project posed by `CSM14204 Compilers` at University of Helsinki. Here is a brief overview of its features, an installation guide, special abilities and deficiencies.

## Installation

To run this compiler a JavaScript runtime of sorts is required. I'd suggest NodeJS for this purpose because it is also the platform I used to develop it with and I am certain it cooperates with! I've used NodeJS version 18.14.2 but you may use any more recent version as well. To get your copy of NodeJS on Ubuntu run:

```sh
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
sudo apt-get install -y nodejs
```

or refer to [NodeSource](https://github.com/nodesource/distributions/blob/master/README.md) for more accurate instructions. Once you've installed NodeJS run: `node -v` and check if it is the right version.

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
- Functions

### Special features

There are some special features in my language implementation that are not mentioned by the specification:

- builtin `pow` for exponentiation (Limitation: does not support negative exponents)
- Binary operator `**` (which calls the above mentioned function)
- short-hand syntax for one line functions e.g. `fun square(x: Int): Int = x * x`

### Design decisions

- The short-hand syntax for functions inserts an implicit return right after the `=`-sign and parses anything but top-level blocks. So `fun square(x: Int): Int = { return x * x }` would be considered illegal and hence would not compile.
- Return has been implemented as such that on a missing return expression at the end of a block it is automatically inserted by the parser at compile-time.

## Known Issues

- Currently, the following function cannot be compiled because of the implicit returns:
```
fun square(x: Int): Int {
    return x * x;
}
```