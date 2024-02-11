import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

export function Assembler(){
    let as = process.env.CSCP_ASM || 'as'
    const filename = (file) => path.parse(file).name

    this.assemble = function(asm, options){
        options = options || {}

        const tmpname = options.tmpname || 'asm'
        const out = options.out || 'a.out'
        const run = options.run !== undefined && !!options.run
        
        const src = `${tmpname}.s`
        const stdlib = 'stdlib.s'

        fs.writeFileSync(stdlib, STDLIB_ASM_CODE)
        fs.writeFileSync(src, asm)

        try {
            let stdout
            
            if (as === 'rasm'){
                stdout = execFileSync('./rasm.sh', [`-q${run ? 'r': ''}o`, out, src, stdlib], { shell: true })
            } else {
                const src_obj = `${filename(src)}.o`
                const stdlib_obj = `${filename(stdlib)}.o`

                execFileSync(as, ['-g', '-o', src_obj, src])
                execFileSync(as, ['-g', '-o', stdlib_obj, stdlib])
                execFileSync('ld', ['-o', out, '-static', src_obj, stdlib_obj])

                if (run){
                    stdout = execFileSync(`./${out}`, { shell: true })
                }
                fs.rmSync(out)
                fs.rmSync(src_obj)
                fs.rmSync(stdlib_obj)
            }
            return stdout ? stdout.toString() : ''
        } finally {
            fs.rmSync(src)
            fs.rmSync(stdlib)
        }
    }
}

const STDLIB_ASM_CODE = `
.global _start
.global print_int
.global print_bool
.global read_int
.global pow
.extern main
.section .text

# ***** Function '_start' *****
# Calls function 'main', prints the output value, and halts the program

_start:
call main
movq $60, %rax
xorq %rdi, %rdi
syscall

# ***** Function 'pow' *****
# Multiplies the input number times x by itself.
#
# Registers:
# - rdi = the number that should be multiplied
# - rsi = the number of times that rdi should be multiplied by itself
pow:
movq %rdi, %r10           # copy base to r10
movq %rsi, %r11           # copy exponent to r11
cmpq $0, %r11             # check if exponent is negative
jl .Lpow_neg_exp_err
movq $1, %rax             # initialize result register (%rax) with 1

.Lpow_loop:
imulq %r10, %rax
decq %r11                 # decrement the exponent
cmpq $0, %r11             # check if exponent is zero
jne .Lpow_loop            # if it is not, it means we still have to multiply
ret

.Lpow_neg_exp_err:
movq $1, %rax
movq $2, %rdi
movq $pow_neg_error_str, %rsi
movq $pow_neg_error_str_len, %rdx
syscall
jmp .Lexit


# ***** Function 'print_int' *****
# Prints a 64-bit signed integer followed by a newline.
#
# We'll build up the digits to print on the stack.
# We generate the least significant digit first,
# and the stack grows downward, so that works out nicely.
#
# Algorithm:
#     push(newline)
#     if x < 0:
#         negative = true
#         x = -x
#     while x > 0:
#         push(digit for (x % 10))
#         x = x / 10
#     if negative:
#         push(minus sign)
#     syscall 'write' with pushed data
#     return the original argument
#
# Registers:
# - rdi = our input number, which we divide down as we go
# - rsp = stack pointer, pointing to the next character to emit.
# - rbp = pointer to one after the last byte of our output (which grows downward)
# - r9 = whether the number was negative
# - r10 = a copy of the original input, so we can return it
# - rax, rcx and rdx are used by intermediate computations

print_int:
pushq %rbp               # Save previous stack frame pointer
movq %rsp, %rbp          # Set stack frame pointer
movq %rdi, %r10          # Back up original input
decq %rsp                # Point rsp at first byte of output
                         # TODO: this non-alignment confuses debuggers. Use a different register?

# Add newline as the last output byte
movb $10, (%rsp)         # ASCII newline = 10
decq %rsp

# Check for zero and negative cases
xorq %r9, %r9
xorq %rax, %rax
cmpq $0, %rdi
je .Ljust_zero
jge .Lnot_negative
movq $1, %r9
negq %rdi                # Handle as positive

.Lnot_negative:

.Ldigit_loop:
cmpq $0, %rdi
je .Ldigits_done        # Loop done when input = 0

# Divide rdi by 10
movq %rdi, %rax
movq $10, %rcx
cqto
idivq %rcx               # Sets rax = quotient and rdx = remainder

movq %rax, %rdi          # The quotient becomes our remaining input
addl $48, %edx           # ASCII '0' = 48. Add the remainder to get the correct digit.
movb %dl, (%rsp)         # Store the digit in the output
decq %rsp
jmp .Ldigit_loop

.Ljust_zero:
movb $48, (%rsp)         # ASCII '0' = 48
decq %rsp

.Ldigits_done:

# Add minus sign if negative
cmpq $0, %r9
je .Lminus_done
movb $45, (%rsp)         # ASCII '-' = 45
decq %rsp
.Lminus_done:

# Call syscall 'write'
movq $1, %rax            # rax = syscall number for write
movq $1, %rdi            # rdi = file handle for stdout
# rsi = pointer to message
movq %rsp, %rsi
incq %rsi
# rdx = number of bytes
movq %rbp, %rdx
subq %rsp, %rdx
decq %rdx
syscall

# Restore stack registers and return the original input
movq %rbp, %rsp
popq %rbp
movq %r10, %rax
ret


# ***** Function 'print_bool' *****
# Prints either 'true' or 'false', followed by a newline.
print_bool:
pushq %rbp               # Save previous stack frame pointer
movq %rsp, %rbp          # Set stack frame pointer
movq %rdi, %r10          # Back up original input

cmpq $0, %rdi            # See if the argument is false (i.e. 0)
jne .Ltrue
movq $false_str, %rsi    # If so, set %rsi to the address of the string for false
movq $false_str_len, %rdx       # and %rdx to the length of that string,
jmp .Lwrite
.Ltrue:
movq $true_str, %rsi     # otherwise do the same with the string for true.
movq $true_str_len, %rdx

.Lwrite:
# Call syscall 'write'
movq $1, %rax            # rax = syscall number for write
movq $1, %rdi            # rdi = file handle for stdout
# rsi = pointer to message (already set above)
# rdx = number of bytes (already set above)
syscall

# Restore stack registers and return the original input
movq %rbp, %rsp
popq %rbp
movq %r10, %rax
ret

true_str:
.ascii "true\\n"
true_str_len = . - true_str
false_str:
.ascii "false\\n"
false_str_len = . - false_str

# ***** Function 'read_int' *****
# Reads an integer from stdin, skipping non-digit characters, until a newline.
#
# To avoid the complexity of buffering, it very inefficiently
# makes a syscall to read each byte.
#
# It crashes the program if input could not be read.
read_int:
pushq %rbp           # Save previous stack frame pointer
movq %rsp, %rbp      # Set stack frame pointer
subq $16, %rsp       # Reserve space for input
                     # (we only need 1 byte, but getting 16 for alignment)

xorq %r9, %r9        # Clear r9 - it'll store the minus sign
xorq %r10, %r10      # Clear r10 - it'll accumulate our output
                     # Skip r11 - syscalls destroy it
xorq %r12, %r12      # Clear r12 - it'll count the number of input bytes read.

# Loop until a newline or end of input is encountered
.Lloop:
decq %rsi
cmpq %rsp, %rsi
je .Lend

# Call syscall 'read'
xorq %rax, %rax      # syscall number for read = 0
xorq %rdi, %rdi      # file handle for stdin = 0
movq %rsp, %rsi      # rsi = pointer to buffer
movq $1, %rdx        # rdx = buffer size
syscall              # result in rax = number of bytes read,
                     # or 0 on end of input, -1 on error

# Check return value: either -1, 0 or 1.
cmpq $0, %rax
jg .Lno_error
je .Lend_of_input
jmp .Lerror

.Lend_of_input:
cmpq $0, %r12
je .Lerror           # If we've read no input, it's an error.
jmp .Lend            # Otherwise complete reading this input.

.Lno_error:
incq %r12            # Increment input byte counter
movq (%rsp), %r8     # Load input byte to r8

# If the input byte is 10 (newline), exit the loop
cmpq $10, %r8
je .Lend

# If the input byte is 45 (minus sign), negate r9
cmpq $45, %r8
jne .Lnegation_done
xorq $1, %r9
.Lnegation_done:

# If the input byte is not between 48 ('0') and 57 ('9')
# then skip it as a junk character.
cmpq $48, %r8
jl .Lloop
cmpq $57, %r8
jg .Lloop

# Subtract 48 to get a digit 0..9
subq $48, %r8

# Shift the digit onto the result
imulq $10, %r10
addq %r8, %r10

jmp .Lloop

.Lend:
# If it's a negative number, negate the result
cmpq $0, %r9
je .Lfinal_negation_done
neg %r10
.Lfinal_negation_done:
# Restore stack registers and return the result
movq %rbp, %rsp
popq %rbp
movq %r10, %rax
ret

.Lerror:
# Write error message to stderr with syscall 'write'
movq $1, %rax
movq $2, %rdi
movq $read_int_error_str, %rsi
movq $read_int_error_str_len, %rdx
syscall

.Lexit:
# Exit the program
movq $60, %rax      # Syscall number for exit = 60.
movq $1, %rdi       # Set exit code 1.
syscall

read_int_error_str:
.ascii "Error: read_int() failed to read input\\n"
read_int_error_str_len = . - read_int_error_str
pow_neg_error_str:
.ascii "Error: pow() does not support negative exponents\\n"
pow_neg_error_str_len = . - pow_neg_error_str
`