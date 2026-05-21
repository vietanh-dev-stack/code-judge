#!/bin/bash
# High-Compatibility Isolate Stub for Judge0
# Hỗ trợ giới hạn thời gian (TLE) bằng lệnh timeout

ARGS="$@"

now_seconds() {
    date +%s.%N
}

elapsed_seconds() {
    awk -v start="$1" -v end="$2" 'BEGIN { printf "%.3f", end - start }'
}

run_with_limits() {
    local cmd="$1"
    local time_limit="$2"
    local mem_file="$3"
    local exit_code=0

    if [ -n "$time_limit" ] && command -v /usr/bin/time >/dev/null 2>&1; then
        if [ -n "$mem_file" ]; then
            /usr/bin/time -f '%M' -o "$mem_file" timeout "$time_limit" bash -lc "$cmd" || exit_code=$?
        else
            timeout "$time_limit" bash -lc "$cmd" || exit_code=$?
        fi
    elif [ -n "$time_limit" ]; then
        timeout "$time_limit" bash -lc "$cmd" || exit_code=$?
    else
        bash -lc "$cmd" || exit_code=$?
    fi

    return "$exit_code"
}

# 1. Xử lý Init
if [[ "$ARGS" == *"--init"* ]]; then
    BOX_ID=0
    if [[ "$ARGS" =~ "-b "([0-9]+) ]]; then BOX_ID="${BASH_REMATCH[1]}"; fi
    SANDBOX_ROOT="/tmp/isolate/$BOX_ID"
    mkdir -p "$SANDBOX_ROOT/box"
    echo "$SANDBOX_ROOT"
    exit 0
fi

# 2. Xử lý Cleanup
if [[ "$ARGS" == *"--cleanup"* ]]; then
    BOX_ID=0
    if [[ "$ARGS" =~ "-b "([0-9]+) ]]; then BOX_ID="${BASH_REMATCH[1]}"; fi
    rm -rf "/tmp/isolate/$BOX_ID"
    exit 0
fi

# 3. Xử lý Run
if [[ "$ARGS" =~ .*" -- ".* ]]; then
    CMD_TO_RUN="${ARGS#* -- }"
    
    BOX_ID=0
    if [[ "$ARGS" =~ "-b "([0-9]+) ]]; then BOX_ID="${BASH_REMATCH[1]}"; fi
    BOX_DIR="/tmp/isolate/$BOX_ID/box"
    
    METADATA_PATH=""
    if [[ "$ARGS" =~ "-M "([^ ]+) ]]; then METADATA_PATH="${BASH_REMATCH[1]}"; fi

    TIME_LIMIT=""
    if [[ "$ARGS" =~ "-t "([0-9.]+) ]]; then TIME_LIMIT="${BASH_REMATCH[1]}"; fi

    if [ -d "$BOX_DIR" ]; then
        cd "$BOX_DIR"
        
        # Chuẩn hoá CMD
        CMD_TO_RUN=$(echo "$CMD_TO_RUN" | sed "s|/var/local/lib/isolate/$BOX_ID/box/||g")
        CMD_TO_RUN=$(echo "$CMD_TO_RUN" | sed 's| /stdin.txt| stdin.txt|g')
        CMD_TO_RUN=$(echo "$CMD_TO_RUN" | sed 's| > /stdout.txt| > stdout.txt|g')
        CMD_TO_RUN=$(echo "$CMD_TO_RUN" | sed 's| 2> /stderr.txt| 2> stderr.txt|g')
        CMD_TO_RUN=$(echo "$CMD_TO_RUN" | sed 's| > /compile_output.txt| > compile_output.txt|g')

        MEM_FILE=""
        if [ -n "$METADATA_PATH" ]; then
            MEM_FILE="$(dirname "$METADATA_PATH")/.isolate_mem_kb"
        fi

        START=$(now_seconds)
        run_with_limits "$CMD_TO_RUN" "$TIME_LIMIT" "$MEM_FILE"
        EXIT_CODE=$?
        END=$(now_seconds)
        ACTUAL_TIME=$(elapsed_seconds "$START" "$END")

        MAX_RSS=0
        if [ -n "$MEM_FILE" ] && [ -f "$MEM_FILE" ]; then
            MAX_RSS=$(tr -d '[:space:]' < "$MEM_FILE")
            rm -f "$MEM_FILE"
        fi
        
        # Ghi Metadata
        if [ -n "$METADATA_PATH" ]; then
            mkdir -p "$(dirname "$METADATA_PATH")"
            if [ $EXIT_CODE -eq 124 ]; then
                echo "status:TO" > "$METADATA_PATH"
                echo "message:Time limit exceeded" >> "$METADATA_PATH"
                echo "exitcode:124" >> "$METADATA_PATH"
                echo "time:${TIME_LIMIT:-$ACTUAL_TIME}" >> "$METADATA_PATH"
            else
                echo "status:OK" > "$METADATA_PATH"
                echo "exitcode:$EXIT_CODE" >> "$METADATA_PATH"
                echo "time:$ACTUAL_TIME" >> "$METADATA_PATH"
            fi
            echo "max-rss:${MAX_RSS:-0}" >> "$METADATA_PATH"
        fi
    fi
else
    exit 0
fi
