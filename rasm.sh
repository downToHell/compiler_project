#!/bin/bash

function help {
    echo "usage: $0 [-hioq][files...]

OPTIONS:
   -h         display this help text here
   -q         enables silent mode i.e. the app only displays errors
   -i <file>  private key file for ssh
   -o <file>  name of the executable

ENVIRONMENT VARIABLES:
   RASM_HOST_PATH=\"username@hostname:/path/to/working_dir\"
   RASM_HOST_KEY=\"/path/to/private_ssh_key\""
}

function handle_process_died {
    if [ $? -ne 0 ]; then
        echo "Child process exited with status code: $?"
        exit $?
    fi
}

# if no command line arguments are given print help and exit
if [ $# -lt 1 ]; then
    help $0
    exit 1
fi

args=$(getopt hqi:o: $*)

# if args could not be parsed (i.e. missing argument) exit
if [ $? -ne 0 ]; then
    exit 1
fi
set -- $args

OUT_FILE="a.out"
VERBOSE=1
FILES=()

# handleopt: handle command line arguments and set according flags
for i
do
    case $i in
        -h)
        help $0
        exit 0
        ;;
        -i)
        HOST_KEY="$2"
        shift 2
        ;;
        -o)
        OUT_FILE="$2"
        shift 2
        ;;
        -q)
        VERBOSE=0
        shift
        ;;
        *)
        if [ "$1" != "--" ]; then
            FILES+=($1)
        fi;
        shift
        ;;
    esac
done

# initssh: make sure we have a host path and a private key
HOST_PATH="$RASM_HOST_PATH"

if [ -z "$HOST_KEY" ]; then
    HOST_KEY="$RASM_HOST_KEY"
fi

if [[ -z "$HOST_PATH" || -z "$HOST_KEY" ]]; then
    echo "Make sure environment variables RASM_HOST_PATH and RASM_HOST_KEY are set!"
    exit 1
fi

BLUE="\033[34;1m"
RESET="\033[m"

# main: running scp and ssh to assemble using a remote host
if [ $VERBOSE -eq 1 ]; then
    echo -e "${BLUE}Uploading ${#FILES[@]} file(s) to host: ${HOST_PATH}${RESET}"
fi

scp -i "$HOST_KEY" "${FILES[@]}" "$HOST_PATH"
handle_process_died

if [ $VERBOSE -eq 1 ]; then
    echo -e "${BLUE}Running remote assembler${RESET}"
fi

# make_command: make an asm and linker command for each file in the arguments
CMD=""
OBJ_FILES=()

for i in "${!FILES[@]}"; do
    OBJ="${FILES[i]%%.*}.o"
    OBJ_FILES+=("$OBJ")

    CMD+="as -g -o $OBJ ${FILES[i]}"

    if [ $i -ne $(( ${#FILES[@]} - 1 )) ]; then
        CMD+=" && "
    fi
done

CMD="$CMD && ld -o $OUT_FILE -static ${OBJ_FILES[@]} && ./$OUT_FILE"

if [ $VERBOSE -eq 1 ]; then
    echo $CMD
fi

# assemble: run the comand on the server
ssh -i "$HOST_KEY" "${HOST_PATH%%:*}" "$CMD"
handle_process_died